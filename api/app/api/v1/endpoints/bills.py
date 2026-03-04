"""Bills endpoints: list team bills, remind unpaid players, mark payment.

All responses use the unified envelope from ``app.core.response``.
Redis caching is applied to read endpoints; cache is invalidated on writes.
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

import redis.asyncio as aioredis

from app.core.db import get_session
from app.core.deps import get_current_user, require_captain
from app.core.redis import get_redis
from app.core.response import error_response, paginated_response, success_response
from app.core.serializers import serialize
from app.models.bill import Bill, BillPlayer
from app.models.player import Player
from app.models.team import Team
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /teams/{team_id}/bills
# ---------------------------------------------------------------------------
@router.get("/teams/{team_id}/bills")
async def list_team_bills(
    team_id: uuid.UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = 1,
    pageSize: int = 20,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Return paginated bills for *team_id*, optionally filtered by status.

    Each bill includes a ``players`` array with individual payment status.
    Results are cached in Redis for 2 minutes.

    Query params:
        status  -- ``collecting`` or ``completed`` (optional)
        page    -- page number (default 1)
        pageSize -- items per page (default 20)
    """
    # Build cache key
    cache_key = f"bills:{team_id}:{status_filter or 'all'}:{page}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Count query
    count_stmt = select(func.count()).select_from(Bill).where(Bill.team_id == team_id)
    if status_filter in ("collecting", "completed"):
        count_stmt = count_stmt.where(Bill.status == status_filter)
    total_result = await session.exec(count_stmt)
    total: int = total_result.one()

    # Data query
    data_stmt = select(Bill).where(Bill.team_id == team_id)
    if status_filter in ("collecting", "completed"):
        data_stmt = data_stmt.where(Bill.status == status_filter)
    data_stmt = data_stmt.order_by(Bill.date.desc()).offset((page - 1) * pageSize).limit(pageSize)  # type: ignore[union-attr]
    bills_result = await session.exec(data_stmt)
    bills = bills_result.all()

    items: list[dict] = []
    for bill in bills:
        bill_dict = serialize(bill)

        # Fetch associated players
        bp_stmt = select(BillPlayer).where(BillPlayer.bill_id == bill.id)
        bp_result = await session.exec(bp_stmt)
        bill_players = bp_result.all()

        players_list: list[dict] = []
        for bp in bill_players:
            # Resolve player name / avatar
            player_stmt = select(Player).where(Player.id == bp.player_id)
            player_result = await session.exec(player_stmt)
            player = player_result.first()

            player_data = serialize(bp)
            if player:
                player_data["name"] = player.name
                player_data["avatar"] = player.avatar
            players_list.append(player_data)

        bill_dict["players"] = players_list
        items.append(bill_dict)

    response = paginated_response(items=items, total=total, page=page, page_size=pageSize)

    # Cache for 2 minutes
    await redis.set(cache_key, json.dumps(response), ex=120)
    return response


# ---------------------------------------------------------------------------
# POST /bills/{bill_id}/remind
# ---------------------------------------------------------------------------
@router.post("/bills/{bill_id}/remind")
async def remind_unpaid_players(
    bill_id: uuid.UUID,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Send payment reminders to all unpaid players in a bill.

    Rate-limited to one reminder per bill per day (Redis TTL = 86 400 s).
    The current implementation is a stub that counts players without
    actually dispatching notifications.
    """
    # Fetch the bill
    bill_stmt = select(Bill).where(Bill.id == bill_id)
    bill_result = await session.exec(bill_stmt)
    bill = bill_result.first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="账单不存在")

    # Verify the captain owns the bill's team
    team_stmt = select(Team).where(Team.id == bill.team_id)
    team_result = await session.exec(team_stmt)
    team = team_result.first()
    if not team or team.captain_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅该球队队长可催缴")

    # Rate-limit: one reminder per bill per day
    rate_key = f"remind:{bill_id}:last"
    last_remind = await redis.get(rate_key)
    if last_remind:
        return error_response(
            code=4006,
            message="今日已催缴过，请明天再试",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Get unpaid players
    unpaid_stmt = select(BillPlayer).where(
        BillPlayer.bill_id == bill_id,
        BillPlayer.status == "unpaid",
    )
    unpaid_result = await session.exec(unpaid_stmt)
    unpaid_players = unpaid_result.all()

    reminders_sent = len(unpaid_players)
    sent_at = datetime.now(timezone.utc).isoformat()

    # Set rate-limit key with 24-hour TTL
    await redis.set(rate_key, sent_at, ex=86400)

    return success_response(
        data={
            "billId": str(bill_id),
            "remindersSent": reminders_sent,
            "sentAt": sent_at,
        },
        message=f"已向 {reminders_sent} 名球员发送催缴通知",
    )


# ---------------------------------------------------------------------------
# POST /bills/{bill_id}/players/{player_id}/pay
# ---------------------------------------------------------------------------
@router.post("/bills/{bill_id}/players/{player_id}/pay")
async def mark_player_paid(
    bill_id: uuid.UUID,
    player_id: uuid.UUID,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Mark a single player as having paid their share of a bill.

    When ``paid_count`` reaches ``total_count`` the bill status is
    automatically set to ``completed``.  Related Redis caches are
    invalidated.
    """
    # Fetch the bill
    bill_stmt = select(Bill).where(Bill.id == bill_id)
    bill_result = await session.exec(bill_stmt)
    bill = bill_result.first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="账单不存在")

    # Verify the captain owns the bill's team
    team_stmt = select(Team).where(Team.id == bill.team_id)
    team_result = await session.exec(team_stmt)
    team = team_result.first()
    if not team or team.captain_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅该球队队长可确认缴费")

    # Fetch the bill_player record
    bp_stmt = select(BillPlayer).where(
        BillPlayer.bill_id == bill_id,
        BillPlayer.player_id == player_id,
    )
    bp_result = await session.exec(bp_stmt)
    bill_player = bp_result.first()
    if not bill_player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该球员不在此账单中")

    if bill_player.status == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该球员已缴费")

    # Update payment
    now = datetime.now(timezone.utc)
    bill_player.status = "paid"
    bill_player.paid_at = now
    session.add(bill_player)

    # Increment paid_count
    bill.paid_count += 1
    bill_status = bill.status
    if bill.paid_count >= bill.total_count:
        bill.status = "completed"
        bill_status = "completed"
    bill.updated_at = now
    session.add(bill)

    await session.commit()
    await session.refresh(bill_player)
    await session.refresh(bill)

    # Invalidate Redis cache for this team's bills
    async for key in redis.scan_iter(f"bills:{bill.team_id}:*"):
        await redis.delete(key)

    return success_response(
        data={
            "billId": str(bill_id),
            "playerId": str(player_id),
            "status": "paid",
            "paidAt": now.isoformat(),
            "paidCount": bill.paid_count,
            "totalCount": bill.total_count,
            "billStatus": bill_status,
        },
        message="缴费确认成功",
    )

"""Matches endpoints: lobby, scheduling, match lifecycle, and reporting.

Covers:
- GET  /matches              -- 约球大厅 (lobby listing)
- POST /matches              -- 发起约球 (create request)
- GET  /matches/schedule      -- 我的赛程
- GET  /matches/history       -- 历史战绩
- GET  /matches/{match_id}    -- 约球详情
- POST /matches/{match_id}/accept  -- 应战
- POST /matches/{match_id}/cancel  -- 取消
- GET  /matches/{match_id}/conflict-check
- POST /matches/{record_id}/report   -- 录入比赛数据
- POST /matches/{record_id}/confirm  -- 确认比赛结果
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user, require_captain
from app.core.redis import get_redis
from app.core.response import error_response, paginated_response, success_response
from app.core.serializers import serialize
from app.models.bill import Bill, BillPlayer
from app.models.match import MatchRecord, MatchRequest
from app.models.player import Player
from app.models.team import CreditHistory, Team
from app.models.user import User
from app.services.conflict import check_time_conflict
from app.services.credit import credit_for_cancellation, credit_for_completion

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic V2 request schemas
# ---------------------------------------------------------------------------


class CostBreakdownIn(BaseModel):
    """Fee breakdown provided by the host captain."""

    pitch_fee: Decimal = Field(default=Decimal("0"))
    referee_fee: Decimal = Field(default=Decimal("0"))
    water_fee: Decimal = Field(default=Decimal("0"))


class VasIn(BaseModel):
    """Value-added services selection."""

    video_service: bool = False
    insurance_player_ids: list[str] = Field(default_factory=list)


class CreateMatchIn(BaseModel):
    """POST /matches request body."""

    date: date
    time: time
    duration: int = Field(ge=30, le=180)
    format: str
    location: str
    field_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    intensity: str
    gender_req: str = "any"
    jersey_color: str = "#FF0000"
    cost_breakdown: CostBreakdownIn
    amenities: list[str] = Field(default_factory=list)
    vas: VasIn = Field(default_factory=VasIn)
    urgent_top: bool = False
    memo: str | None = None


class GoalStat(BaseModel):
    """Individual goal count for a player."""

    player_id: str
    count: int = Field(ge=0)


class AssistStat(BaseModel):
    """Individual assist count for a player."""

    player_id: str
    count: int = Field(ge=0)


class ReportMatchIn(BaseModel):
    """POST /matches/{record_id}/report request body."""

    my_score: int = Field(ge=0)
    opponent_score: int = Field(ge=0)
    mvp_player_id: str | None = None
    goals: list[GoalStat] = Field(default_factory=list)
    assists: list[AssistStat] = Field(default_factory=list)
    lineup: list[str] = Field(min_length=1)
    total_fee: Decimal = Field(ge=0)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _is_vip(user: User) -> bool:
    """Return True if user holds VIP_CAPTAIN role."""
    return user.role == "VIP_CAPTAIN"


def _cache_key_for_params(prefix: str, params: dict) -> str:
    """Build a deterministic Redis cache key from query parameters."""
    raw = json.dumps(params, sort_keys=True, default=str)
    h = hashlib.md5(raw.encode()).hexdigest()  # noqa: S324
    return f"{prefix}:{h}"


async def _invalidate_pattern(rds: aioredis.Redis, pattern: str) -> None:
    """Delete all Redis keys matching *pattern* (SCAN-based)."""
    cursor: int | bytes = 0
    while True:
        cursor, keys = await rds.scan(cursor=cursor, match=pattern, count=200)
        if keys:
            await rds.delete(*keys)
        if cursor == 0:
            break


def _serialize_team_brief(team: Team) -> dict:
    """Produce the compact host/guest team dict used in listings."""
    return {
        "id": str(team.id),
        "name": team.name,
        "logo": team.logo,
        "creditScore": team.credit_score,
        "isVerified": team.is_verified,
        "memberCount": team.member_count,
    }


def _mask_tags(tags: list, *, reveal: bool) -> list:
    """Mask negative tags with ``'***'`` unless the viewer has VIP access."""
    if reveal:
        return tags
    negative_keywords = ["迟到", "暴力", "差评", "违规", "弃赛", "不守时", "不友好"]
    return [
        tag if not any(kw in tag for kw in negative_keywords) else "***"
        for tag in (tags or [])
    ]


# ---------------------------------------------------------------------------
# GET /matches -- 约球大厅 (lobby listing)
# ---------------------------------------------------------------------------


@router.get("")
async def list_matches(
    keyword: str | None = Query(default=None, max_length=50),
    format: str | None = Query(default=None, alias="format"),
    intensity: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    location: str | None = Query(default=None),
    date_filter: date | None = Query(default=None, alias="date"),
    time_range: str | None = Query(default=None, alias="timeRange"),
    max_distance: float | None = Query(default=None, alias="maxDistance"),
    min_credit: int | None = Query(default=None, alias="minCredit"),
    verified_only: bool | None = Query(default=None, alias="verifiedOnly"),
    sort_by: str = Query(default="smart", alias="sortBy"),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50, alias="pageSize"),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Return paginated open match requests for the lobby.

    VIP-exclusive filters: ``minCredit``, ``verifiedOnly``.
    Non-VIP users silently have these filters stripped.
    """
    # Non-VIP users cannot use premium filters
    if not _is_vip(user):
        min_credit = None
        verified_only = None

    # --- Redis cache --------------------------------------------------------
    cache_params = {
        "keyword": keyword,
        "format": format,
        "intensity": intensity,
        "gender": gender,
        "location": location,
        "date": str(date_filter),
        "timeRange": time_range,
        "maxDistance": max_distance,
        "minCredit": min_credit,
        "verifiedOnly": verified_only,
        "sortBy": sort_by,
        "lat": latitude,
        "lng": longitude,
        "page": page,
        "pageSize": page_size,
    }
    cache_key = _cache_key_for_params("matches:list", cache_params)

    cached = await rds.get(cache_key)
    if cached:
        return json.loads(cached)

    # --- Build query --------------------------------------------------------
    stmt = (
        select(MatchRequest, Team)
        .join(Team, MatchRequest.host_team_id == Team.id)
        .where(MatchRequest.status == "open")
    )

    if keyword:
        stmt = stmt.where(
            col(MatchRequest.location).contains(keyword)
            | col(Team.name).contains(keyword)
        )
    if format:
        stmt = stmt.where(MatchRequest.format == format)
    if intensity:
        stmt = stmt.where(MatchRequest.intensity == intensity)
    if gender:
        stmt = stmt.where(MatchRequest.gender_req == gender)
    if location:
        stmt = stmt.where(col(MatchRequest.location).contains(location))
    if date_filter:
        stmt = stmt.where(MatchRequest.date == date_filter)

    # Time range filter
    today = date.today()
    if time_range == "today":
        stmt = stmt.where(MatchRequest.date == today)
    elif time_range == "tomorrow":
        stmt = stmt.where(MatchRequest.date == today + timedelta(days=1))
    elif time_range == "this_week":
        week_end = today + timedelta(days=(6 - today.weekday()))
        stmt = stmt.where(
            MatchRequest.date >= today,
            MatchRequest.date <= week_end,
        )

    # VIP-only filters
    if min_credit is not None:
        stmt = stmt.where(Team.credit_score >= min_credit)
    if verified_only:
        stmt = stmt.where(Team.is_verified == True)  # noqa: E712

    # --- Count before pagination -------------------------------------------
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await session.exec(count_stmt)
    total: int = total_result.one()

    # --- Sorting -----------------------------------------------------------
    # urgentTop records always float to the top
    stmt = stmt.order_by(MatchRequest.urgent_top.desc())  # type: ignore[union-attr]
    if sort_by == "newest":
        stmt = stmt.order_by(MatchRequest.created_at.desc())  # type: ignore[union-attr]
    elif sort_by == "price_asc":
        stmt = stmt.order_by(MatchRequest.total_price.asc())  # type: ignore[union-attr]
    elif sort_by == "price_desc":
        stmt = stmt.order_by(MatchRequest.total_price.desc())  # type: ignore[union-attr]
    elif sort_by == "credit":
        stmt = stmt.order_by(Team.credit_score.desc())  # type: ignore[union-attr]
    else:
        # "smart" default: newest first
        stmt = stmt.order_by(MatchRequest.created_at.desc())  # type: ignore[union-attr]

    # --- Pagination --------------------------------------------------------
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await session.exec(stmt)
    rows = result.all()

    items: list[dict] = []
    for match_req, team in rows:
        item: dict = {
            "id": str(match_req.id),
            "hostTeam": _serialize_team_brief(team),
            "date": match_req.date.isoformat(),
            "time": match_req.time.strftime("%H:%M"),
            "duration": match_req.duration,
            "format": match_req.format,
            "location": match_req.location,
            "intensity": match_req.intensity,
            "genderReq": match_req.gender_req,
            "jerseyColor": match_req.jersey_color,
            "costBreakdown": {
                "pitchFee": float(match_req.pitch_fee),
                "refereeFee": float(match_req.referee_fee),
                "waterFee": float(match_req.water_fee),
            },
            "totalPrice": float(match_req.total_price),
            "amenities": match_req.amenities or [],
            "status": match_req.status,
        }
        # Placeholder for geo distance; real implementation needs PostGIS
        if (
            latitude is not None
            and longitude is not None
            and match_req.latitude is not None
            and match_req.longitude is not None
        ):
            item["distance"] = None  # TODO: Haversine / PostGIS
        items.append(item)

    response = paginated_response(items, total, page, page_size)

    # Cache for 2 minutes
    await rds.set(cache_key, json.dumps(response, default=str), ex=120)

    return response


# ---------------------------------------------------------------------------
# POST /matches -- 发起约球 (create request)
# ---------------------------------------------------------------------------


@router.post("")
async def create_match(
    body: CreateMatchIn,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Publish a new match request to the lobby."""
    if user.current_team_id is None:
        raise HTTPException(status_code=400, detail="请先选择一个球队")

    # urgentTop is VIP-only
    if body.urgent_top and not _is_vip(user):
        raise HTTPException(status_code=403, detail="仅VIP队长可使用置顶功能")

    total_price = (
        body.cost_breakdown.pitch_fee
        + body.cost_breakdown.referee_fee
        + body.cost_breakdown.water_fee
    )

    match_req = MatchRequest(
        host_team_id=user.current_team_id,
        date=body.date,
        time=body.time,
        duration=body.duration,
        format=body.format,
        location=body.location,
        field_name=body.field_name,
        latitude=body.latitude,
        longitude=body.longitude,
        intensity=body.intensity,
        gender_req=body.gender_req,
        jersey_color=body.jersey_color,
        pitch_fee=body.cost_breakdown.pitch_fee,
        referee_fee=body.cost_breakdown.referee_fee,
        water_fee=body.cost_breakdown.water_fee,
        total_price=total_price,
        amenities=body.amenities,
        video_service=body.vas.video_service,
        insurance_player_ids=[str(pid) for pid in body.vas.insurance_player_ids],
        urgent_top=body.urgent_top,
        memo=body.memo,
    )
    session.add(match_req)
    await session.commit()
    await session.refresh(match_req)

    # Invalidate list caches
    await _invalidate_pattern(rds, "matches:list:*")

    return success_response(data=serialize(match_req), message="约球发布成功")


# ---------------------------------------------------------------------------
# GET /matches/schedule -- 我的赛程
# ---------------------------------------------------------------------------


@router.get("/schedule")
async def my_schedule(
    match_status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50, alias="pageSize"),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Return the current team's match records (schedule view)."""
    if user.current_team_id is None:
        raise HTTPException(status_code=400, detail="请先选择一个球队")

    team_id = user.current_team_id

    # --- Redis cache --------------------------------------------------------
    cache_key = f"schedule:{team_id}:{match_status}:{page}"
    cached = await rds.get(cache_key)
    if cached:
        return json.loads(cached)

    # --- Query --------------------------------------------------------------
    stmt = select(MatchRecord).where(
        (MatchRecord.host_team_id == team_id)
        | (MatchRecord.guest_team_id == team_id)
    )
    if match_status:
        stmt = stmt.where(MatchRecord.status == match_status)

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await session.exec(count_stmt)
    total: int = total_result.one()

    stmt = stmt.order_by(
        MatchRecord.date.desc(),  # type: ignore[union-attr]
        MatchRecord.time.desc(),  # type: ignore[union-attr]
    )
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await session.exec(stmt)
    records = result.all()

    items: list[dict] = []
    for record in records:
        # Determine opponent
        opponent_id = (
            record.guest_team_id
            if record.host_team_id == team_id
            else record.host_team_id
        )
        opponent = await session.get(Team, opponent_id)

        item = serialize(record)
        item["opponentId"] = str(opponent_id)
        item["opponentName"] = opponent.name if opponent else "未知球队"
        item["opponentLogo"] = opponent.logo if opponent else ""
        items.append(item)

    response = paginated_response(items, total, page, page_size)
    await rds.set(cache_key, json.dumps(response, default=str), ex=120)

    return response


# ---------------------------------------------------------------------------
# GET /matches/history -- 历史战绩
# ---------------------------------------------------------------------------


@router.get("/history")
async def match_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50, alias="pageSize"),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Return the current team's finished match records with scores."""
    if user.current_team_id is None:
        raise HTTPException(status_code=400, detail="请先选择一个球队")

    team_id = user.current_team_id

    cache_key = f"history:{team_id}:{page}:{page_size}"
    cached = await rds.get(cache_key)
    if cached:
        return json.loads(cached)

    stmt = select(MatchRecord).where(
        (
            (MatchRecord.host_team_id == team_id)
            | (MatchRecord.guest_team_id == team_id)
        ),
        MatchRecord.status == "finished",
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await session.exec(count_stmt)
    total: int = total_result.one()

    stmt = stmt.order_by(
        MatchRecord.date.desc(),  # type: ignore[union-attr]
        MatchRecord.time.desc(),  # type: ignore[union-attr]
    )
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await session.exec(stmt)
    records = result.all()

    items: list[dict] = []
    for record in records:
        opponent_id = (
            record.guest_team_id
            if record.host_team_id == team_id
            else record.host_team_id
        )
        opponent = await session.get(Team, opponent_id)

        item = serialize(record)
        item["opponentId"] = str(opponent_id)
        item["opponentName"] = opponent.name if opponent else "未知球队"
        item["opponentLogo"] = opponent.logo if opponent else ""
        item["hostTeamScore"] = record.host_team_score
        item["guestTeamScore"] = record.guest_team_score
        items.append(item)

    response = paginated_response(items, total, page, page_size)
    await rds.set(cache_key, json.dumps(response, default=str), ex=300)

    return response


# ---------------------------------------------------------------------------
# GET /matches/{match_id} -- 约球详情
# ---------------------------------------------------------------------------


@router.get("/{match_id}")
async def get_match_detail(
    match_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Return full details of a match request.

    VIP viewers see extended intel: recent results, credit history, and
    unmasked tags.  Non-VIP viewers get masked negative tags and no
    historical data.
    """
    vip = _is_vip(user)
    cache_key = f"match:{match_id}:{vip}"
    cached = await rds.get(cache_key)
    if cached:
        return json.loads(cached)

    match_req = await session.get(MatchRequest, match_id)
    if not match_req:
        raise HTTPException(status_code=404, detail="约球不存在")

    host_team = await session.get(Team, match_req.host_team_id)
    if not host_team:
        raise HTTPException(status_code=404, detail="发起球队不存在")

    # Build host team data
    host_data = _serialize_team_brief(host_team)
    host_data["tags"] = _mask_tags(host_team.tags or [], reveal=vip)

    if vip:
        # Recent results: last 10 finished matches
        recent_stmt = (
            select(MatchRecord)
            .where(
                (
                    (MatchRecord.host_team_id == host_team.id)
                    | (MatchRecord.guest_team_id == host_team.id)
                ),
                MatchRecord.status == "finished",
            )
            .order_by(MatchRecord.date.desc())  # type: ignore[union-attr]
            .limit(10)
        )
        recent_result = await session.exec(recent_stmt)
        host_data["recentResults"] = [serialize(r) for r in recent_result.all()]

        # Credit history (last 20 entries)
        ch_stmt = (
            select(CreditHistory)
            .where(CreditHistory.team_id == host_team.id)
            .order_by(CreditHistory.date.desc())  # type: ignore[union-attr]
            .limit(20)
        )
        ch_result = await session.exec(ch_stmt)
        host_data["creditHistory"] = [serialize(h) for h in ch_result.all()]

    # Guest team (if matched)
    guest_data = None
    if match_req.guest_team_id:
        guest_team = await session.get(Team, match_req.guest_team_id)
        if guest_team:
            guest_data = _serialize_team_brief(guest_team)
            guest_data["tags"] = _mask_tags(guest_team.tags or [], reveal=vip)

    data = serialize(match_req)
    data["hostTeam"] = host_data
    data["guestTeam"] = guest_data
    data["costBreakdown"] = {
        "pitchFee": float(match_req.pitch_fee),
        "refereeFee": float(match_req.referee_fee),
        "waterFee": float(match_req.water_fee),
    }

    response = success_response(data=data)
    await rds.set(cache_key, json.dumps(response, default=str), ex=180)

    return response


# ---------------------------------------------------------------------------
# POST /matches/{match_id}/accept -- 应战
# ---------------------------------------------------------------------------


@router.post("/{match_id}/accept")
async def accept_match(
    match_id: uuid.UUID,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Accept an open match request on behalf of the current team.

    - Deducts a 50% deposit from the guest team fund.
    - Creates a ``MatchRecord`` with status ``upcoming``.
    """
    if user.current_team_id is None:
        raise HTTPException(status_code=400, detail="请先选择一个球队")

    match_req = await session.get(MatchRequest, match_id)
    if not match_req:
        raise HTTPException(status_code=404, detail="约球不存在")

    if match_req.status != "open":
        raise HTTPException(status_code=400, detail="该约球已被应战或已关闭")

    # Cannot accept own match
    if match_req.host_team_id == user.current_team_id:
        raise HTTPException(status_code=400, detail="不能应战自己发起的约球")

    guest_team = await session.get(Team, user.current_team_id)
    if not guest_team:
        raise HTTPException(status_code=404, detail="球队不存在")

    # Time conflict check
    conflict = await check_time_conflict(
        session,
        team_id=user.current_team_id,
        match_date=match_req.date,
        match_time=match_req.time,
        duration=match_req.duration,
    )
    if conflict:
        return error_response(
            code=4009,
            message="您的球队在该时段已有比赛安排",
            status_code=409,
            errors=[conflict],
        )

    # Deduct 50% deposit
    deposit = match_req.total_price / 2
    if guest_team.fund_balance < deposit:
        raise HTTPException(
            status_code=400,
            detail="球队基金余额不足，无法缴纳保证金",
        )

    guest_team.fund_balance -= deposit

    # Update match request
    match_req.status = "matched"
    match_req.guest_team_id = user.current_team_id
    match_req.updated_at = datetime.now(timezone.utc)

    # Create match record
    record = MatchRecord(
        match_request_id=match_req.id,
        host_team_id=match_req.host_team_id,
        guest_team_id=user.current_team_id,
        date=match_req.date,
        time=match_req.time,
        location=match_req.location,
        format=match_req.format,
        duration=match_req.duration,
        total_fee=match_req.total_price,
        status="upcoming",
    )
    session.add(record)

    await session.commit()
    await session.refresh(record)

    # Invalidate caches
    await _invalidate_pattern(rds, "matches:list:*")
    await _invalidate_pattern(rds, f"match:{match_id}:*")

    return success_response(
        data={
            "matchId": str(match_req.id),
            "matchRecordId": str(record.id),
            "guestTeamId": str(user.current_team_id),
            "status": match_req.status,
            "deposit": float(deposit),
            "deductedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="应战成功",
    )


# ---------------------------------------------------------------------------
# POST /matches/{match_id}/cancel -- 取消
# ---------------------------------------------------------------------------


@router.post("/{match_id}/cancel")
async def cancel_match(
    match_id: uuid.UUID,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Cancel a match request.

    - If matched and host cancels: status -> 'cancelled', refund deposit.
    - If matched and guest cancels: status -> 'open', clear guest, refund.
    - If open and host cancels: status -> 'cancelled'.
    - Credit penalties apply when cancelling within 24 h of kick-off.
    """
    if user.current_team_id is None:
        raise HTTPException(status_code=400, detail="请先选择一个球队")

    match_req = await session.get(MatchRequest, match_id)
    if not match_req:
        raise HTTPException(status_code=404, detail="约球不存在")

    cancellable_statuses = ("open", "matched")
    if match_req.status not in cancellable_statuses:
        raise HTTPException(status_code=400, detail="当前状态不允许取消")

    is_host = match_req.host_team_id == user.current_team_id
    is_guest = match_req.guest_team_id == user.current_team_id

    if not is_host and not is_guest:
        raise HTTPException(status_code=403, detail="您无权取消该约球")

    refunded = Decimal("0")
    credit_change = 0

    if match_req.status == "matched":
        # Refund deposit to guest team
        deposit = match_req.total_price / 2
        guest_team = await session.get(Team, match_req.guest_team_id)
        if guest_team:
            guest_team.fund_balance += deposit
            refunded = deposit

        # Credit penalty based on proximity to match time
        match_dt = datetime.combine(match_req.date, match_req.time)
        match_dt = match_dt.replace(tzinfo=timezone.utc)
        credit_change = await credit_for_cancellation(
            session, user.current_team_id, match_dt
        )

        # Cancel related match record
        record_stmt = select(MatchRecord).where(
            MatchRecord.match_request_id == match_req.id,
            MatchRecord.status == "upcoming",
        )
        record_result = await session.exec(record_stmt)
        match_record = record_result.first()
        if match_record:
            match_record.status = "cancelled"
            match_record.updated_at = datetime.now(timezone.utc)

        if is_host:
            match_req.status = "cancelled"
        else:
            # Guest cancels: reopen the match
            match_req.status = "open"
            match_req.guest_team_id = None
    else:
        # Status == "open", only host can cancel
        if not is_host:
            raise HTTPException(
                status_code=403,
                detail="仅发起方可取消未应战的约球",
            )
        match_req.status = "cancelled"

    match_req.updated_at = datetime.now(timezone.utc)
    await session.commit()

    # Invalidate caches
    await _invalidate_pattern(rds, "matches:list:*")
    await _invalidate_pattern(rds, f"match:{match_id}:*")
    if user.current_team_id:
        await _invalidate_pattern(rds, f"schedule:{user.current_team_id}:*")

    return success_response(
        data={
            "matchId": str(match_req.id),
            "status": match_req.status,
            "refunded": float(refunded),
            "creditChange": credit_change,
            "refundedAt": (
                datetime.now(timezone.utc).isoformat() if refunded > 0 else None
            ),
        },
        message="取消成功",
    )


# ---------------------------------------------------------------------------
# GET /matches/{match_id}/conflict-check
# ---------------------------------------------------------------------------


@router.get("/{match_id}/conflict-check")
async def conflict_check(
    match_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Check whether the current team has a scheduling conflict with
    the given match request.
    """
    if user.current_team_id is None:
        raise HTTPException(status_code=400, detail="请先选择一个球队")

    match_req = await session.get(MatchRequest, match_id)
    if not match_req:
        raise HTTPException(status_code=404, detail="约球不存在")

    conflict = await check_time_conflict(
        session,
        team_id=user.current_team_id,
        match_date=match_req.date,
        match_time=match_req.time,
        duration=match_req.duration,
    )

    return success_response(
        data={
            "hasConflict": conflict is not None,
            "conflictingMatch": conflict,
        },
    )


# ---------------------------------------------------------------------------
# POST /matches/{record_id}/report -- 录入比赛数据
# ---------------------------------------------------------------------------


@router.post("/{record_id}/report")
async def report_match(
    record_id: uuid.UUID,
    body: ReportMatchIn,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Submit a match report (scores, stats, lineup) and auto-generate a bill.

    Only the host team captain may submit the initial report.
    """
    record = await session.get(MatchRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="比赛记录不存在")

    if record.status != "pending_report":
        raise HTTPException(status_code=400, detail="当前状态不允许提交报告")

    # Must be host captain
    host_team = await session.get(Team, record.host_team_id)
    if not host_team or host_team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="仅主队队长可提交比赛报告")

    # Store report JSON
    report_data = body.model_dump(mode="json")
    record.report = report_data
    record.host_team_score = body.my_score
    record.guest_team_score = body.opponent_score
    record.status = "waiting_confirmation"
    record.total_fee = body.total_fee
    record.updated_at = datetime.now(timezone.utc)

    # Fee per player
    lineup_count = len(body.lineup)
    fee_per_player = (
        body.total_fee / lineup_count if lineup_count > 0 else Decimal("0")
    )
    record.fee_per_player = fee_per_player

    # --- Update player stats -----------------------------------------------
    for goal_stat in body.goals:
        player = await session.get(Player, uuid.UUID(goal_stat.player_id))
        if player:
            player.goals += goal_stat.count
            player_user = await session.get(User, player.user_id)
            if player_user:
                player_user.goals += goal_stat.count

    for assist_stat in body.assists:
        player = await session.get(Player, uuid.UUID(assist_stat.player_id))
        if player:
            player.assists += assist_stat.count
            player_user = await session.get(User, player.user_id)
            if player_user:
                player_user.assists += assist_stat.count

    if body.mvp_player_id:
        mvp_player = await session.get(Player, uuid.UUID(body.mvp_player_id))
        if mvp_player:
            mvp_player.mvp_count += 1
            mvp_user = await session.get(User, mvp_player.user_id)
            if mvp_user:
                mvp_user.mvp_count += 1

    # Update appearances for all lineup players
    for pid_str in body.lineup:
        lp = await session.get(Player, uuid.UUID(pid_str))
        if lp:
            lp_user = await session.get(User, lp.user_id)
            if lp_user:
                lp_user.appearances += 1

    # --- Auto-create Bill + BillPlayer records -----------------------------
    bill = Bill(
        match_record_id=record.id,
        team_id=record.host_team_id,
        title=f"{record.location} {record.date.isoformat()} 比赛费用",
        date=record.date,
        total_amount=body.total_fee,
        per_head=fee_per_player,
        paid_count=0,
        total_count=lineup_count,
        status="collecting",
    )
    session.add(bill)
    await session.flush()  # materialise bill.id

    for pid_str in body.lineup:
        bp = BillPlayer(
            bill_id=bill.id,
            player_id=uuid.UUID(pid_str),
            status="unpaid",
        )
        session.add(bp)

    await session.commit()
    await session.refresh(record)
    await session.refresh(bill)

    # Invalidate schedule caches for both teams
    await _invalidate_pattern(rds, f"schedule:{record.host_team_id}:*")
    await _invalidate_pattern(rds, f"schedule:{record.guest_team_id}:*")

    return success_response(
        data={
            "recordId": str(record.id),
            "status": record.status,
            "feePerPlayer": float(fee_per_player),
            "billId": str(bill.id),
        },
        message="比赛报告提交成功",
    )


# ---------------------------------------------------------------------------
# POST /matches/{record_id}/confirm -- 确认比赛结果
# ---------------------------------------------------------------------------


@router.post("/{record_id}/confirm")
async def confirm_match(
    record_id: uuid.UUID,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    rds: aioredis.Redis = Depends(get_redis),
):
    """Confirm the match report submitted by the host.

    Only the guest team captain may confirm.  Both teams receive credit
    bonuses and win-rate updates upon confirmation.
    """
    record = await session.get(MatchRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="比赛记录不存在")

    confirmable = ("waiting_confirmation", "confirm_needed")
    if record.status not in confirmable:
        raise HTTPException(status_code=400, detail="当前状态不允许确认")

    # Must be guest captain
    guest_team = await session.get(Team, record.guest_team_id)
    if not guest_team or guest_team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="仅客队队长可确认比赛结果")

    record.status = "finished"
    record.updated_at = datetime.now(timezone.utc)

    # Award credit to both teams
    host_credit = await credit_for_completion(session, record.host_team_id)
    guest_credit = await credit_for_completion(session, record.guest_team_id)

    # --- Update team win rates ---------------------------------------------
    for tid in (record.host_team_id, record.guest_team_id):
        total_stmt = select(func.count()).where(
            (
                (MatchRecord.host_team_id == tid)
                | (MatchRecord.guest_team_id == tid)
            ),
            MatchRecord.status == "finished",
        )
        total_result = await session.exec(total_stmt)
        total_matches: int = total_result.one()

        if total_matches == 0:
            continue

        # Count wins for this team
        win_stmt = select(func.count()).where(
            MatchRecord.status == "finished",
            (
                (
                    (MatchRecord.host_team_id == tid)
                    & (
                        MatchRecord.host_team_score
                        > MatchRecord.guest_team_score
                    )
                )
                | (
                    (MatchRecord.guest_team_id == tid)
                    & (
                        MatchRecord.guest_team_score
                        > MatchRecord.host_team_score
                    )
                )
            ),
        )
        win_result = await session.exec(win_stmt)
        wins: int = win_result.one()

        team = await session.get(Team, tid)
        if team:
            team.win_rate = Decimal(str(round(wins / total_matches * 100, 2)))

    await session.commit()

    # Invalidate caches for both teams
    await _invalidate_pattern(rds, f"schedule:{record.host_team_id}:*")
    await _invalidate_pattern(rds, f"schedule:{record.guest_team_id}:*")
    await _invalidate_pattern(rds, f"history:{record.host_team_id}:*")
    await _invalidate_pattern(rds, f"history:{record.guest_team_id}:*")

    return success_response(
        data={
            "recordId": str(record.id),
            "status": record.status,
            "hostCreditChange": host_credit,
            "guestCreditChange": guest_credit,
            "confirmedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="比赛结果确认成功",
    )

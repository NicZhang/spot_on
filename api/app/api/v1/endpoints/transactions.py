"""Transactions endpoints: list, create, and export team financial records.

All responses use the unified envelope from ``app.core.response``.
Redis caching is applied to read endpoints; cache is invalidated on writes.
"""

import json
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

import redis.asyncio as aioredis

from app.core.db import get_session
from app.core.deps import require_captain, require_vip
from app.core.redis import get_redis
from app.core.response import paginated_response, success_response
from app.core.serializers import serialize
from app.models.team import Team
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------
class TransactionCreate(BaseModel):
    """Body schema for creating a new transaction."""

    model_config = ConfigDict(from_attributes=True)

    type: str
    amount: float
    description: str
    category: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _verify_captain_of_team(
    team_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> Team:
    """Return the team if the current user is its captain, else raise 403."""
    team_stmt = select(Team).where(Team.id == team_id)
    team_result = await session.exec(team_stmt)
    team = team_result.first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="球队不存在")
    if team.captain_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅该球队队长可执行此操作")
    return team


# ---------------------------------------------------------------------------
# GET /teams/{team_id}/transactions
# ---------------------------------------------------------------------------
@router.get("/teams/{team_id}/transactions")
async def list_transactions(
    team_id: uuid.UUID,
    type: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
    page: int = 1,
    pageSize: int = 20,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Return paginated transactions for *team_id*.

    Query params:
        type      -- ``income`` or ``expense`` (optional)
        startDate -- ISO date string YYYY-MM-DD (optional)
        endDate   -- ISO date string YYYY-MM-DD (optional)
        page      -- page number (default 1)
        pageSize  -- items per page (default 20)

    Results are cached in Redis for 3 minutes.
    """
    await _verify_captain_of_team(team_id, user, session)

    # Build cache key
    cache_key = (
        f"transactions:{team_id}:{type or 'all'}:"
        f"{startDate or ''}:{endDate or ''}:{page}"
    )
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Base filter
    base_filter = [Transaction.team_id == team_id]
    if type in ("income", "expense"):
        base_filter.append(Transaction.type == type)
    if startDate:
        try:
            start = date.fromisoformat(startDate)
            base_filter.append(Transaction.date >= start)
        except ValueError:
            pass
    if endDate:
        try:
            end = date.fromisoformat(endDate)
            base_filter.append(Transaction.date <= end)
        except ValueError:
            pass

    # Count
    count_stmt = select(func.count()).select_from(Transaction).where(*base_filter)
    total_result = await session.exec(count_stmt)
    total: int = total_result.one()

    # Data
    data_stmt = (
        select(Transaction)
        .where(*base_filter)
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())  # type: ignore[union-attr]
        .offset((page - 1) * pageSize)
        .limit(pageSize)
    )
    txn_result = await session.exec(data_stmt)
    transactions = txn_result.all()

    items = [serialize(t) for t in transactions]

    response = paginated_response(items=items, total=total, page=page, page_size=pageSize)

    # Cache for 3 minutes
    await redis.set(cache_key, json.dumps(response), ex=180)
    return response


# ---------------------------------------------------------------------------
# POST /teams/{team_id}/transactions
# ---------------------------------------------------------------------------
@router.post("/teams/{team_id}/transactions")
async def create_transaction(
    team_id: uuid.UUID,
    body: TransactionCreate,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Create a new income or expense record for the team fund.

    Automatically updates ``team.fund_balance``:
    - income  -> ``+amount``
    - expense -> ``-amount``
    """
    team = await _verify_captain_of_team(team_id, user, session)

    if body.type not in ("income", "expense"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="type 必须为 income 或 expense",
        )
    if body.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="金额必须大于零",
        )

    now = datetime.now(timezone.utc)
    txn = Transaction(
        team_id=team_id,
        type=body.type,
        amount=Decimal(str(body.amount)),
        description=body.description,
        category=body.category,
        operator=user.id,
        date=now.date(),
        created_at=now,
    )
    session.add(txn)

    # Update team balance
    if body.type == "income":
        team.fund_balance += Decimal(str(body.amount))
    else:
        team.fund_balance -= Decimal(str(body.amount))
    team.updated_at = now
    session.add(team)

    await session.commit()
    await session.refresh(txn)
    await session.refresh(team)

    # Invalidate transaction cache for this team
    async for key in redis.scan_iter(f"transactions:{team_id}:*"):
        await redis.delete(key)

    return success_response(
        data={
            "id": str(txn.id),
            "type": txn.type,
            "amount": float(txn.amount),
            "teamBalance": float(team.fund_balance),
            "createdAt": txn.created_at.isoformat(),
        },
        message="交易记录创建成功",
    )


# ---------------------------------------------------------------------------
# GET /teams/{team_id}/finance/export
# ---------------------------------------------------------------------------
@router.get("/teams/{team_id}/finance/export")
async def export_finance(
    team_id: uuid.UUID,
    period: str = Query("month", pattern="^(month|quarter|year)$"),
    year: int = Query(default=2026),
    month: int = Query(default=1),
    format: str = Query("excel", pattern="^(excel|pdf)$"),
    user: User = Depends(require_vip),
    session: AsyncSession = Depends(get_session),
):
    """Generate a financial summary for a given period.

    This is a **stub** endpoint -- it computes aggregate figures but does
    not produce an actual downloadable file.  ``downloadUrl`` is always
    ``null``.

    Query params:
        period -- ``month``, ``quarter``, or ``year``
        year   -- calendar year (default 2026)
        month  -- month number (default 1, used for month/quarter)
        format -- ``excel`` or ``pdf``
    """
    team = await _verify_captain_of_team(team_id, user, session)

    # Determine date range
    if period == "month":
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
    elif period == "quarter":
        quarter_start_month = ((month - 1) // 3) * 3 + 1
        start_date = date(year, quarter_start_month, 1)
        quarter_end_month = quarter_start_month + 3
        if quarter_end_month > 12:
            end_date = date(year + 1, quarter_end_month - 12, 1)
        else:
            end_date = date(year, quarter_end_month, 1)
    else:  # year
        start_date = date(year, 1, 1)
        end_date = date(year + 1, 1, 1)

    # Aggregate income
    income_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.team_id == team_id,
        Transaction.type == "income",
        Transaction.date >= start_date,
        Transaction.date < end_date,
    )
    income_result = await session.exec(income_stmt)
    total_income = income_result.one()

    # Aggregate expense
    expense_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.team_id == team_id,
        Transaction.type == "expense",
        Transaction.date >= start_date,
        Transaction.date < end_date,
    )
    expense_result = await session.exec(expense_stmt)
    total_expense = expense_result.one()

    # Count match-related transactions as a proxy for match count
    match_count_stmt = select(func.count()).select_from(Transaction).where(
        Transaction.team_id == team_id,
        Transaction.related_match_id.is_not(None),  # type: ignore[union-attr]
        Transaction.date >= start_date,
        Transaction.date < end_date,
    )
    match_count_result = await session.exec(match_count_stmt)
    match_count: int = match_count_result.one()

    balance = float(total_income) - float(total_expense)
    avg_cost = float(total_expense) / match_count if match_count > 0 else 0.0

    return success_response(
        data={
            "downloadUrl": None,
            "expiresIn": 3600,
            "summary": {
                "totalIncome": float(total_income),
                "totalExpense": float(total_expense),
                "balance": balance,
                "matchCount": match_count,
                "averageCostPerMatch": round(avg_cost, 2),
            },
        },
        message="财务报表生成成功",
    )

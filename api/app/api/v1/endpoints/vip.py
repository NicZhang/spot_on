"""VIP membership endpoints.

Provides plan listing, subscription creation, and status checking.
Leverages Redis caching for frequently-read plan data and per-user
VIP status.
"""

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.core.response import success_response
from app.core.serializers import serialize
from app.models.user import User
from app.models.vip import VipPlan, VipSubscription

router = APIRouter()

VIP_PLANS_CACHE_TTL = 86400  # 24 hours
VIP_STATUS_CACHE_TTL = 600  # 10 minutes


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class SubscribeRequest(BaseModel):
    """Body for VIP subscription creation."""

    model_config = ConfigDict(populate_by_name=True)

    plan_id: str
    payment_method: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/plans")
async def get_plans(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return all active VIP plans.

    Results are cached in Redis for 24 hours to avoid repeated
    database queries for data that rarely changes.
    """
    # Try Redis cache
    try:
        r = get_redis()
        cached = await r.get("vip:plans")
        if cached is not None:
            plans_data = json.loads(cached)
            return success_response(data=plans_data, message="查询成功")
    except Exception:
        pass

    # Fetch from DB
    stmt = select(VipPlan).where(VipPlan.is_active == True)  # noqa: E712
    result = await session.exec(stmt)
    plans = result.all()

    plans_data = [serialize(plan) for plan in plans]

    # Populate Redis cache
    try:
        r = get_redis()
        await r.set("vip:plans", json.dumps(plans_data), ex=VIP_PLANS_CACHE_TTL)
    except Exception:
        pass

    return success_response(data=plans_data, message="查询成功")


@router.post("/subscribe")
async def subscribe(
    body: SubscribeRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Subscribe the current user to a VIP plan.

    Business rules
    ---------------
    - The selected plan must exist and be active.
    - The ``month_trial`` plan can only be used once per user.
    - On success the user's role is upgraded to ``VIP_CAPTAIN``.
    """
    # Validate plan
    stmt = select(VipPlan).where(VipPlan.id == body.plan_id)
    result = await session.exec(stmt)
    plan = result.first()

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会员套餐不存在",
        )

    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该套餐已下架",
        )

    # Trial plan: ensure one-time usage
    if plan.name == "month_trial":
        trial_stmt = select(VipSubscription).where(
            VipSubscription.user_id == current_user.id,
            VipSubscription.plan_id == plan.id,
        )
        trial_result = await session.exec(trial_stmt)
        if trial_result.first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="试用套餐仅可使用一次",
            )

    # Create subscription
    now = datetime.now(timezone.utc)
    subscription = VipSubscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status="active",
        start_date=now,
        end_date=now + timedelta(days=plan.duration_days),
        auto_renew=True,
        payment_method=body.payment_method,
    )
    session.add(subscription)

    # Upgrade user role
    current_user.role = "VIP_CAPTAIN"
    current_user.updated_at = now
    session.add(current_user)

    await session.commit()
    await session.refresh(subscription)

    # Invalidate user cache and VIP status cache
    try:
        r = get_redis()
        await r.delete(f"user:{current_user.id}")
        await r.delete(f"vip:status:{current_user.id}")
    except Exception:
        pass

    return success_response(
        data={
            "subscriptionId": str(subscription.id),
            "planName": plan.display_name,
            "startDate": subscription.start_date.isoformat(),
            "endDate": subscription.end_date.isoformat(),
        },
        message="订阅成功",
    )


@router.get("/status")
async def get_status(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the user's current active VIP subscription, or null.

    Cached in Redis for 10 minutes per user.
    """
    user_id_str = str(current_user.id)
    cache_key = f"vip:status:{user_id_str}"

    # Try Redis cache
    try:
        r = get_redis()
        cached = await r.get(cache_key)
        if cached is not None:
            status_data = json.loads(cached)
            return success_response(data=status_data, message="查询成功")
    except Exception:
        pass

    # Query the latest active subscription that hasn't expired
    now = datetime.now(timezone.utc)
    stmt = (
        select(VipSubscription)
        .where(
            VipSubscription.user_id == current_user.id,
            VipSubscription.status == "active",
            VipSubscription.end_date > now,
        )
        .order_by(VipSubscription.end_date.desc())  # type: ignore[union-attr]
    )
    result = await session.exec(stmt)
    subscription = result.first()

    if subscription is None:
        status_data = None
    else:
        # Fetch associated plan for the display name
        plan_stmt = select(VipPlan).where(VipPlan.id == subscription.plan_id)
        plan_result = await session.exec(plan_stmt)
        plan = plan_result.first()

        sub_data = serialize(subscription)
        if plan is not None:
            sub_data["planName"] = plan.display_name
        status_data = sub_data

    # Cache result
    try:
        r = get_redis()
        await r.set(cache_key, json.dumps(status_data), ex=VIP_STATUS_CACHE_TTL)
    except Exception:
        pass

    return success_response(data=status_data, message="查询成功")

"""User profile endpoints.

Provides ``GET /users/me`` and ``PATCH /users/me`` for the currently
authenticated user. User data is cached in Redis for fast reads.
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.core.response import success_response
from app.core.serializers import serialize
from app.models.user import User

router = APIRouter()

USER_CACHE_TTL = 3600  # 1 hour


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class UserUpdateRequest(BaseModel):
    """Allowed fields for profile update.

    Only fields explicitly sent (non-default) will be applied.
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    avatar: str | None = None
    gender: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_user_response(user_data: dict) -> dict:
    """Enrich user data with a nested ``stats`` object for the frontend."""
    stats = {
        "goals": user_data.get("goals", 0),
        "assists": user_data.get("assists", 0),
        "mvpCount": user_data.get("mvpCount", 0),
        "appearances": user_data.get("appearances", 0),
        "balance": user_data.get("balance", 0.0),
    }
    user_data["stats"] = stats
    return user_data


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the full profile for the authenticated user.

    Reads from the Redis cache when available; falls back to the
    in-memory model instance already fetched by ``get_current_user``.
    """
    # Try Redis cache first
    try:
        r = get_redis()
        cached = await r.get(f"user:{current_user.id}")
        if cached is not None:
            user_data: dict = json.loads(cached)
            return success_response(
                data=_build_user_response(user_data),
                message="查询成功",
            )
    except Exception:
        pass

    # Serialize from the DB model
    user_data = serialize(current_user)

    # Cache for subsequent requests
    try:
        r = get_redis()
        await r.set(
            f"user:{current_user.id}",
            json.dumps(user_data),
            ex=USER_CACHE_TTL,
        )
    except Exception:
        pass

    return success_response(
        data=_build_user_response(user_data),
        message="查询成功",
    )


@router.patch("/me")
async def update_me(
    body: UserUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Update the authenticated user's profile fields.

    Only non-null fields in the request body are applied. The
    ``updated_at`` timestamp is refreshed automatically.
    """
    update_data = body.model_dump(exclude_unset=True)

    if not update_data:
        return success_response(
            data=_build_user_response(serialize(current_user)),
            message="无需更新",
        )

    for field, value in update_data.items():
        setattr(current_user, field, value)

    current_user.updated_at = datetime.now(timezone.utc)
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    # Invalidate Redis cache so the next GET /me returns fresh data
    try:
        r = get_redis()
        await r.delete(f"user:{current_user.id}")
    except Exception:
        pass

    return success_response(
        data=_build_user_response(serialize(current_user)),
        message="更新成功",
    )

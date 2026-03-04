"""Players API endpoints.

Handles individual player detail retrieval and profile updates.
Team-scoped player operations (list, invite, join, remove) are in
``app.api.v1.endpoints.teams``.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.core.response import success_response
from app.core.serializers import serialize
from app.models.player import Player
from app.models.team import Team
from app.models.user import User

router = APIRouter(prefix="/players")


# ---------------------------------------------------------------------------
# Request Schemas (Pydantic V2)
# ---------------------------------------------------------------------------


class UpdatePlayerRequest(BaseModel):
    """Body for PATCH /players/{player_id}."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(default=None, max_length=50)
    number: int | None = None
    position: str | None = Field(default=None, max_length=10)
    avatar: str | None = None
    height: int | None = None
    weight: int | None = None
    strong_foot: str | None = Field(default=None, alias="strongFoot", max_length=10)
    level: str | None = Field(default=None, max_length=20)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _invalidate_keys(redis, *keys: str) -> None:
    """Delete one or more Redis cache keys."""
    for key in keys:
        await redis.delete(key)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/{player_id}")
async def get_player(
    player_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return full player info with aggregated stats."""
    stmt = select(Player).where(Player.id == player_id)
    result = await session.exec(stmt)
    player = result.first()

    if not player:
        raise HTTPException(status_code=404, detail="球员不存在")

    data = serialize(player)
    data["stats"] = {
        "goals": player.goals,
        "assists": player.assists,
        "mvpCount": player.mvp_count,
    }
    return success_response(data=data)


@router.patch("/{player_id}")
async def update_player(
    player_id: uuid.UUID,
    body: UpdatePlayerRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update player profile fields.

    The requester must be either:
    - The captain of the player's team, OR
    - The player themselves (matched via ``user_id``).
    """
    stmt = select(Player).where(Player.id == player_id)
    result = await session.exec(stmt)
    player = result.first()

    if not player:
        raise HTTPException(status_code=404, detail="球员不存在")

    # Authorization: captain of the team or the player themselves
    is_self = player.user_id == user.id
    is_captain = False
    if not is_self:
        team_stmt = select(Team).where(Team.id == player.team_id)
        team_result = await session.exec(team_stmt)
        team = team_result.first()
        if team and team.captain_id == user.id:
            is_captain = True

    if not is_self and not is_captain:
        raise HTTPException(
            status_code=403,
            detail="仅球员本人或球队队长可修改球员信息",
        )

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    if not update_data:
        return success_response(data=serialize(player), message="无更新内容")

    for field, value in update_data.items():
        setattr(player, field, value)
    player.updated_at = datetime.now(timezone.utc)

    session.add(player)
    await session.commit()
    await session.refresh(player)

    # Invalidate related caches
    redis = get_redis()
    await _invalidate_keys(
        redis,
        f"team:players:{player.team_id}:1:20",
    )

    data = serialize(player)
    data["stats"] = {
        "goals": player.goals,
        "assists": player.assists,
        "mvpCount": player.mvp_count,
    }
    return success_response(data=data, message="球员信息更新成功")

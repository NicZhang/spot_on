"""Teams API endpoints.

Handles team CRUD, search, verification, reporting, player management,
and invite/join flows. All database operations are async.
"""

import json
import math
import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user, require_captain
from app.core.redis import get_redis
from app.core.response import error_response, paginated_response, success_response
from app.core.serializers import serialize
from app.models.match import MatchRecord
from app.models.player import Player
from app.models.team import (
    CreditHistory,
    Team,
    TeamInvite,
    TeamReport,
    TeamVerification,
)
from app.models.user import User

router = APIRouter(prefix="/teams")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_NEGATIVE_TAG_KEYWORDS = ["爽约", "暴力", "迟到", "恶意", "虚假", "差评", "违规"]

_VALID_REPORT_REASONS = frozenset(
    ["虚假信息", "恶意爽约", "比赛中暴力行为", "虚报信用分", "其他"]
)

_INVITE_CODE_CHARS = string.ascii_uppercase + string.digits
_INVITE_CODE_LENGTH = 10

_CACHE_TTL_TEAM_MINE = 300  # 5 minutes
_CACHE_TTL_TEAM_DETAIL = 300  # 5 minutes
_CACHE_TTL_TEAM_PLAYERS = 180  # 3 minutes

# Free captain: max 1 team; VIP captain: max 3 teams
_MAX_TEAMS_FREE_CAPTAIN = 1
_MAX_TEAMS_VIP_CAPTAIN = 3

# Member limits
_MEMBER_LIMIT_FREE = 30
_MEMBER_LIMIT_VIP = 100

# Verification benefits shown to users
_VERIFICATION_BENEFITS = [
    "获得认证徽章，提升球队可信度",
    "在搜索结果中优先展示",
    "解锁高级匹配功能",
]


# ---------------------------------------------------------------------------
# Request / Response Schemas (Pydantic V2)
# ---------------------------------------------------------------------------


class CreateTeamRequest(BaseModel):
    """Body for POST /teams."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=30, alias="name")
    gender: str = Field(..., max_length=10, alias="gender")
    location: str = Field(..., max_length=100, alias="location")


class UpdateTeamRequest(BaseModel):
    """Body for PATCH /teams/{team_id}."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(default=None, max_length=30)
    announcement: str | None = Field(default=None)
    logo: str | None = Field(default=None)
    home_jersey_color: str | None = Field(default=None, alias="homeJerseyColor")
    away_jersey_color: str | None = Field(default=None, alias="awayJerseyColor")


class VerificationRequest(BaseModel):
    """Body for POST /teams/{team_id}/verification."""

    model_config = ConfigDict(populate_by_name=True)

    real_name: str = Field(..., alias="realName")
    id_card: str = Field(..., alias="idCard")
    phone: str
    description: str | None = None
    id_front_image_id: str = Field(..., alias="idFrontImageId")
    id_back_image_id: str = Field(..., alias="idBackImageId")
    team_photo_image_id: str | None = Field(default=None, alias="teamPhotoImageId")


class ReportRequest(BaseModel):
    """Body for POST /teams/{team_id}/report."""

    model_config = ConfigDict(populate_by_name=True)

    reason: str
    description: str | None = None


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


def _is_vip(user: User) -> bool:
    """Check whether the user holds the VIP_CAPTAIN role."""
    return user.role == "VIP_CAPTAIN"


def _mask_negative_tags(tags: list) -> list:
    """Replace negative tags with '***' for non-VIP users."""
    if not tags:
        return tags
    masked: list[str] = []
    for tag in tags:
        if any(kw in str(tag) for kw in _NEGATIVE_TAG_KEYWORDS):
            masked.append("***")
        else:
            masked.append(tag)
    return masked


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate approximate distance in km between two lat/lon points."""
    r = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _generate_invite_code() -> str:
    """Generate a random 10-char alphanumeric invite code."""
    return "".join(random.choices(_INVITE_CODE_CHARS, k=_INVITE_CODE_LENGTH))


async def _invalidate_keys(redis, *keys: str) -> None:
    """Delete one or more Redis cache keys (fire-and-forget)."""
    for key in keys:
        await redis.delete(key)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/mine")
async def get_my_teams(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return all teams captained by the current user.

    Cached in Redis for 5 minutes under key ``teams:mine:{user_id}``.
    """
    redis = get_redis()
    cache_key = f"teams:mine:{user.id}"

    cached = await redis.get(cache_key)
    if cached:
        return success_response(data=json.loads(cached))

    stmt = select(Team).where(Team.captain_id == user.id)
    result = await session.exec(stmt)
    teams = result.all()

    data = [serialize(t) for t in teams]
    await redis.set(cache_key, json.dumps(data), ex=_CACHE_TTL_TEAM_MINE)
    return success_response(data=data)


@router.post("")
async def create_team(
    body: CreateTeamRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new team.

    - PLAYER users are automatically upgraded to FREE_CAPTAIN.
    - FREE_CAPTAIN may own at most 1 team; VIP_CAPTAIN at most 3.
    """
    # Count existing teams owned by this user
    count_stmt = select(func.count()).where(Team.captain_id == user.id)
    count_result = await session.exec(count_stmt)
    existing_count: int = count_result.one()

    max_teams = (
        _MAX_TEAMS_VIP_CAPTAIN if _is_vip(user) else _MAX_TEAMS_FREE_CAPTAIN
    )

    # PLAYER creating first team gets upgraded to FREE_CAPTAIN
    if user.role == "PLAYER":
        max_teams = _MAX_TEAMS_FREE_CAPTAIN

    if existing_count >= max_teams:
        role_label = "VIP队长" if _is_vip(user) else "普通队长"
        return error_response(
            code=4000,
            message=f"{role_label}最多创建{max_teams}支球队",
            status_code=400,
        )

    team = Team(
        name=body.name,
        gender=body.gender,
        location=body.location,
        captain_id=user.id,
        credit_score=100,
        member_count=0,
    )
    session.add(team)

    # Upgrade role if user is still a PLAYER
    if user.role == "PLAYER":
        user.role = "FREE_CAPTAIN"

    user.current_team_id = team.id
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)

    await session.commit()
    await session.refresh(team)
    await session.refresh(user)

    # Invalidate caches
    redis = get_redis()
    await _invalidate_keys(
        redis, f"teams:mine:{user.id}", f"user:{user.id}"
    )

    return success_response(data=serialize(team), message="球队创建成功")


@router.put("/{team_id}/switch")
async def switch_team(
    team_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Switch the user's active team.

    The user must be either the captain of the target team or a player in it.
    """
    # Check the team exists
    stmt = select(Team).where(Team.id == team_id)
    result = await session.exec(stmt)
    team = result.first()
    if not team:
        raise HTTPException(status_code=404, detail="球队不存在")

    # Verify the user is captain or a member
    is_captain = team.captain_id == user.id
    if not is_captain:
        player_stmt = select(Player).where(
            Player.team_id == team_id, Player.user_id == user.id
        )
        player_result = await session.exec(player_stmt)
        if not player_result.first():
            raise HTTPException(status_code=403, detail="你不是该球队的成员")

    user.current_team_id = team.id
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    await session.commit()

    redis = get_redis()
    await _invalidate_keys(redis, f"user:{user.id}")

    return success_response(
        data={"currentTeamId": str(team.id), "teamName": team.name},
        message="切换球队成功",
    )


@router.patch("/{team_id}")
async def update_team(
    team_id: uuid.UUID,
    body: UpdateTeamRequest,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
):
    """Update partial team information. Only the captain of the team may do so."""
    stmt = select(Team).where(Team.id == team_id)
    result = await session.exec(stmt)
    team = result.first()
    if not team:
        raise HTTPException(status_code=404, detail="球队不存在")

    if team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="仅球队队长可修改球队信息")

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        setattr(team, field, value)
    team.updated_at = datetime.now(timezone.utc)

    session.add(team)
    await session.commit()
    await session.refresh(team)

    redis = get_redis()
    await _invalidate_keys(
        redis, f"team:{team_id}", f"teams:mine:{user.id}"
    )

    return success_response(data=serialize(team), message="球队信息更新成功")


@router.get("/search")
async def search_teams(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    keyword: str | None = Query(default=None),
    location: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    min_credit: int | None = Query(default=None, alias="minCredit"),
    min_win_rate: float | None = Query(default=None, alias="minWinRate"),
    verified_only: bool | None = Query(default=None, alias="verifiedOnly"),
    sort_by: str | None = Query(default=None, alias="sortBy"),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
):
    """Search teams with filters, pagination, and optional distance sorting.

    Non-VIP users can only see teams with credit_score >= 60 and cannot use
    ``minCredit`` or ``verifiedOnly`` filters.
    """
    is_vip_user = _is_vip(user)
    stmt = select(Team)

    # Base filter for non-VIP: only show teams with credit >= 60
    if not is_vip_user:
        stmt = stmt.where(Team.credit_score >= 60)

    # Keyword search on name and location (case-insensitive)
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(
            or_(
                col(Team.name).ilike(pattern),
                col(Team.location).ilike(pattern),
            )
        )

    # Location filter
    if location:
        stmt = stmt.where(col(Team.location).ilike(f"%{location}%"))

    # Gender filter
    if gender:
        stmt = stmt.where(Team.gender == gender)

    # VIP-only filters
    if is_vip_user:
        if min_credit is not None:
            stmt = stmt.where(Team.credit_score >= min_credit)
        if verified_only:
            stmt = stmt.where(Team.is_verified == True)  # noqa: E712

    # Win rate filter (available to all users)
    if min_win_rate is not None:
        stmt = stmt.where(Team.win_rate >= min_win_rate)

    # Sorting
    if sort_by == "creditScore":
        stmt = stmt.order_by(Team.credit_score.desc())
    elif sort_by == "winRate":
        stmt = stmt.order_by(Team.win_rate.desc())
    elif sort_by == "memberCount":
        stmt = stmt.order_by(Team.member_count.desc())
    elif sort_by == "newest":
        stmt = stmt.order_by(Team.created_at.desc())
    else:
        # Default: order by credit score descending
        stmt = stmt.order_by(Team.credit_score.desc())

    # Count total before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await session.exec(count_stmt)
    total: int = count_result.one()

    # Apply pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await session.exec(stmt)
    teams = result.all()

    # Build response items with optional distance
    items: list[dict] = []
    for team in teams:
        item = serialize(team)

        # Calculate distance if coordinates provided
        distance: float | None = None
        if (
            latitude is not None
            and longitude is not None
            and team.latitude is not None
            and team.longitude is not None
        ):
            distance = round(
                _haversine_distance(latitude, longitude, team.latitude, team.longitude),
                1,
            )
        item["distance"] = distance
        items.append(item)

    # Sort by distance in Python if requested and coordinates available
    if sort_by == "distance" and latitude is not None and longitude is not None:
        items.sort(key=lambda x: x.get("distance") if x.get("distance") is not None else float("inf"))

    return paginated_response(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{team_id}")
async def get_team_detail(
    team_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return full team detail including recent results and credit history.

    - ``recentResults``: last 10 finished match records for this team.
    - ``creditHistory``: only returned for VIP users; empty list otherwise.
    - ``tags``: negative tags are masked as ``***`` for non-VIP users.

    Cached in Redis for 5 minutes (base team data only; VIP-specific data
    is always queried fresh to ensure access control).
    """
    redis = get_redis()
    cache_key = f"team:{team_id}"

    # Try to load base team data from cache
    team: Team | None = None
    cached = await redis.get(cache_key)
    if cached:
        team_data = json.loads(cached)
    else:
        stmt = select(Team).where(Team.id == team_id)
        result = await session.exec(stmt)
        team = result.first()
        if not team:
            raise HTTPException(status_code=404, detail="球队不存在")
        team_data = serialize(team)
        await redis.set(cache_key, json.dumps(team_data), ex=_CACHE_TTL_TEAM_DETAIL)

    # Mask negative tags for non-VIP users
    is_vip_user = _is_vip(user)
    if not is_vip_user and team_data.get("tags"):
        team_data["tags"] = _mask_negative_tags(team_data["tags"])

    # Recent results: last 10 finished match records involving this team
    match_stmt = (
        select(MatchRecord)
        .where(
            or_(
                MatchRecord.host_team_id == team_id,
                MatchRecord.guest_team_id == team_id,
            ),
            MatchRecord.status == "finished",
        )
        .order_by(MatchRecord.date.desc())
        .limit(10)
    )
    match_result = await session.exec(match_stmt)
    recent_matches = match_result.all()
    team_data["recentResults"] = [serialize(m) for m in recent_matches]

    # Credit history: VIP only
    if is_vip_user:
        credit_stmt = (
            select(CreditHistory)
            .where(CreditHistory.team_id == team_id)
            .order_by(CreditHistory.date.desc())
        )
        credit_result = await session.exec(credit_stmt)
        credit_records = credit_result.all()
        team_data["creditHistory"] = [serialize(c) for c in credit_records]
    else:
        team_data["creditHistory"] = []

    return success_response(data=team_data)


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------


@router.post("/{team_id}/verification")
async def submit_verification(
    team_id: uuid.UUID,
    body: VerificationRequest,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
):
    """Submit a team identity verification request.

    The captain must own the team, and no existing ``reviewing`` or
    ``verified`` verification may exist for this team.
    """
    # Verify captain owns the team
    stmt = select(Team).where(Team.id == team_id)
    result = await session.exec(stmt)
    team = result.first()
    if not team:
        raise HTTPException(status_code=404, detail="球队不存在")
    if team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="仅球队队长可提交认证")

    # Check for existing active verification
    existing_stmt = select(TeamVerification).where(
        TeamVerification.team_id == team_id,
        TeamVerification.status.in_(["reviewing", "verified"]),
    )
    existing_result = await session.exec(existing_stmt)
    if existing_result.first():
        return error_response(
            code=4000,
            message="该球队已有进行中或已通过的认证申请",
            status_code=400,
        )

    # Validate id_card format: must be 18 characters
    if len(body.id_card) != 18:
        return error_response(
            code=4000,
            message="身份证号码必须为18位",
            status_code=400,
        )

    verification = TeamVerification(
        team_id=team_id,
        real_name=body.real_name,
        id_card=body.id_card,
        phone=body.phone,
        description=body.description,
        id_front_image_id=body.id_front_image_id,
        id_back_image_id=body.id_back_image_id,
        team_photo_image_id=body.team_photo_image_id,
        status="reviewing",
    )
    session.add(verification)
    await session.commit()
    await session.refresh(verification)

    return success_response(
        data={
            "verificationId": str(verification.id),
            "status": "reviewing",
            "submittedAt": verification.submitted_at.isoformat(),
            "estimatedDays": 3,
        },
        message="认证申请已提交",
    )


@router.get("/{team_id}/verification")
async def get_verification(
    team_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return the latest verification record for a team."""
    stmt = (
        select(TeamVerification)
        .where(TeamVerification.team_id == team_id)
        .order_by(TeamVerification.submitted_at.desc())
        .limit(1)
    )
    result = await session.exec(stmt)
    verification = result.first()

    if not verification:
        return success_response(data=None, message="暂无认证记录")

    return success_response(
        data={
            "status": verification.status,
            "submittedAt": verification.submitted_at.isoformat(),
            "reviewedAt": (
                verification.reviewed_at.isoformat()
                if verification.reviewed_at
                else None
            ),
            "rejectReason": verification.reject_reason,
            "benefits": _VERIFICATION_BENEFITS,
        }
    )


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


@router.post("/{team_id}/report")
async def report_team(
    team_id: uuid.UUID,
    body: ReportRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Report a team for misconduct.

    - Each user may only report the same team once per 24 hours.
    - ``reason`` must be one of the predefined values.
    """
    # Validate reason
    if body.reason not in _VALID_REPORT_REASONS:
        return error_response(
            code=4000,
            message=f"举报原因必须为以下之一: {', '.join(_VALID_REPORT_REASONS)}",
            status_code=400,
        )

    # Check team exists
    team_stmt = select(Team).where(Team.id == team_id)
    team_result = await session.exec(team_stmt)
    if not team_result.first():
        raise HTTPException(status_code=404, detail="球队不存在")

    # Check 24-hour duplicate
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    dup_stmt = select(TeamReport).where(
        TeamReport.team_id == team_id,
        TeamReport.reporter_id == user.id,
        TeamReport.created_at >= cutoff,
    )
    dup_result = await session.exec(dup_stmt)
    if dup_result.first():
        return error_response(
            code=4000,
            message="24小时内不能重复举报同一球队",
            status_code=400,
        )

    report = TeamReport(
        team_id=team_id,
        reporter_id=user.id,
        reason=body.reason,
        description=body.description,
        status="pending",
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    return success_response(
        data={
            "reportId": str(report.id),
            "status": "pending",
            "createdAt": report.created_at.isoformat(),
        },
        message="举报已提交",
    )


# ---------------------------------------------------------------------------
# Players (within a team context)
# ---------------------------------------------------------------------------


@router.get("/{team_id}/players")
async def get_team_players(
    team_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
):
    """Return paginated player list for a team.

    Cached in Redis for 3 minutes.
    """
    redis = get_redis()
    cache_key = f"team:players:{team_id}:{page}:{page_size}"

    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Verify team exists
    team_stmt = select(Team).where(Team.id == team_id)
    team_result = await session.exec(team_stmt)
    if not team_result.first():
        raise HTTPException(status_code=404, detail="球队不存在")

    # Count total players
    count_stmt = select(func.count()).where(Player.team_id == team_id)
    count_result = await session.exec(count_stmt)
    total: int = count_result.one()

    # Fetch players with pagination
    offset = (page - 1) * page_size
    stmt = (
        select(Player)
        .where(Player.team_id == team_id)
        .order_by(Player.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.exec(stmt)
    players = result.all()

    items: list[dict] = []
    for p in players:
        player_data = serialize(p)
        player_data["stats"] = {
            "goals": p.goals,
            "assists": p.assists,
            "mvpCount": p.mvp_count,
        }
        items.append(player_data)

    response = paginated_response(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

    await redis.set(cache_key, json.dumps(response), ex=_CACHE_TTL_TEAM_PLAYERS)
    return response


# ---------------------------------------------------------------------------
# Invite & Join
# ---------------------------------------------------------------------------


@router.post("/{team_id}/invite")
async def create_invite(
    team_id: uuid.UUID,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
):
    """Generate a team invite code. Only the team captain may do this."""
    stmt = select(Team).where(Team.id == team_id)
    result = await session.exec(stmt)
    team = result.first()
    if not team:
        raise HTTPException(status_code=404, detail="球队不存在")
    if team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="仅球队队长可生成邀请链接")

    # Generate unique invite code (retry on collision)
    for _ in range(10):
        code = _generate_invite_code()
        existing_stmt = select(TeamInvite).where(TeamInvite.invite_code == code)
        existing_result = await session.exec(existing_stmt)
        if not existing_result.first():
            break
    else:
        return error_response(
            code=5000, message="生成邀请码失败，请重试", status_code=500
        )

    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    invite = TeamInvite(
        team_id=team_id,
        invite_code=code,
        expires_at=expires_at,
    )
    session.add(invite)
    await session.commit()
    await session.refresh(invite)

    invite_link = f"/teams/join/{code}"

    return success_response(
        data={
            "inviteCode": code,
            "inviteLink": invite_link,
            "qrCode": invite.qr_code,
            "expiresIn": 2592000,  # 30 days in seconds
        },
        message="邀请链接已生成",
    )


@router.post("/join/{invite_code}")
async def join_team(
    invite_code: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Join a team via invite code.

    Validates invite expiry, team member limits, and duplicate membership.
    """
    # Find the invite
    invite_stmt = select(TeamInvite).where(TeamInvite.invite_code == invite_code)
    invite_result = await session.exec(invite_stmt)
    invite = invite_result.first()
    if not invite:
        raise HTTPException(status_code=404, detail="邀请码不存在")

    # Check expiry
    if invite.expires_at < datetime.now(timezone.utc):
        return error_response(
            code=4000, message="邀请码已过期", status_code=400
        )

    # Load team
    team_stmt = select(Team).where(Team.id == invite.team_id)
    team_result = await session.exec(team_stmt)
    team = team_result.first()
    if not team:
        raise HTTPException(status_code=404, detail="球队不存在")

    # Check member limit based on captain's role
    captain_stmt = select(User).where(User.id == team.captain_id)
    captain_result = await session.exec(captain_stmt)
    captain = captain_result.first()

    member_limit = (
        _MEMBER_LIMIT_VIP
        if captain and captain.role == "VIP_CAPTAIN"
        else _MEMBER_LIMIT_FREE
    )
    if team.member_count >= member_limit:
        return error_response(
            code=4000,
            message=f"球队成员已达上限({member_limit}人)",
            status_code=400,
        )

    # Check user not already a member
    existing_player_stmt = select(Player).where(
        Player.team_id == team.id, Player.user_id == user.id
    )
    existing_player_result = await session.exec(existing_player_stmt)
    if existing_player_result.first():
        return error_response(
            code=4000, message="你已是该球队成员", status_code=400
        )

    # Create player record
    player = Player(
        team_id=team.id,
        user_id=user.id,
        name=user.name,
        avatar=user.avatar,
    )
    session.add(player)

    # Increment member count
    team.member_count += 1
    team.updated_at = datetime.now(timezone.utc)
    session.add(team)

    # Set current_team_id if not already set
    if user.current_team_id is None:
        user.current_team_id = team.id
        user.updated_at = datetime.now(timezone.utc)
        session.add(user)

    await session.commit()
    await session.refresh(player)

    # Invalidate caches
    redis = get_redis()
    await _invalidate_keys(
        redis,
        f"team:{team.id}",
        f"teams:mine:{team.captain_id}",
        f"user:{user.id}",
    )
    # Invalidate all player list pages for this team (pattern-based)
    # We delete known first-page cache as a practical approach
    await _invalidate_keys(redis, f"team:players:{team.id}:1:20")

    return success_response(
        data={
            "teamId": str(team.id),
            "teamName": team.name,
            "playerId": str(player.id),
        },
        message="加入球队成功",
    )


# ---------------------------------------------------------------------------
# Remove player
# ---------------------------------------------------------------------------


@router.delete("/{team_id}/players/{player_id}")
async def remove_player(
    team_id: uuid.UUID,
    player_id: uuid.UUID,
    user: User = Depends(require_captain),
    session: AsyncSession = Depends(get_session),
):
    """Remove a player from the team. Only the team captain may do this."""
    # Verify captain owns the team
    team_stmt = select(Team).where(Team.id == team_id)
    team_result = await session.exec(team_stmt)
    team = team_result.first()
    if not team:
        raise HTTPException(status_code=404, detail="球队不存在")
    if team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="仅球队队长可移除球员")

    # Find the player record
    player_stmt = select(Player).where(
        Player.id == player_id, Player.team_id == team_id
    )
    player_result = await session.exec(player_stmt)
    player = player_result.first()
    if not player:
        raise HTTPException(status_code=404, detail="球员不存在")

    removed_user_id = player.user_id

    # Delete the player record
    await session.delete(player)

    # Decrement member count
    team.member_count = max(0, team.member_count - 1)
    team.updated_at = datetime.now(timezone.utc)
    session.add(team)

    # Clear the removed user's current_team_id if it points to this team
    removed_user_stmt = select(User).where(User.id == removed_user_id)
    removed_user_result = await session.exec(removed_user_stmt)
    removed_user = removed_user_result.first()
    if removed_user and removed_user.current_team_id == team_id:
        removed_user.current_team_id = None
        removed_user.updated_at = datetime.now(timezone.utc)
        session.add(removed_user)

    await session.commit()

    # Invalidate caches
    redis = get_redis()
    await _invalidate_keys(
        redis,
        f"team:{team_id}",
        f"teams:mine:{user.id}",
        f"user:{removed_user_id}",
        f"team:players:{team_id}:1:20",
    )

    return success_response(data=None, message="球员已移除")

"""Authentication endpoints.

Handles WeChat login, phone-based login/binding, token refresh,
and logout. All tokens are JWT-based with refresh token rotation
stored in the ``refresh_tokens`` table.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.core.response import success_response
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.serializers import serialize
from app.models.user import RefreshToken, SmsCode, User
from app.services.sms import generate_sms_code, send_sms_code
from app.services.wechat import code_to_session

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ACCESS_TOKEN_EXPIRE_SECONDS = 7 * 24 * 3600  # 604800 (7 days)
SMS_CODE_EXPIRE_SECONDS = 600  # 10 minutes
SMS_CODE_RATE_LIMIT_SECONDS = 60
USER_CACHE_TTL = 3600  # 1 hour


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class WechatLoginRequest(BaseModel):
    """Body for WeChat login."""

    model_config = ConfigDict(populate_by_name=True)

    code: str
    encrypted_data: str | None = None
    iv: str | None = None


class PhoneLoginRequest(BaseModel):
    """Body for phone + SMS-code login."""

    phone: str
    code: str


class SendCodeRequest(BaseModel):
    """Body for requesting an SMS code."""

    phone: str


class PhoneBindRequest(BaseModel):
    """Body for binding a phone number to the current user."""

    phone: str
    code: str


class RefreshTokenRequest(BaseModel):
    """Body for token refresh."""

    refresh_token: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _cache_user(user: User) -> None:
    """Store serialized user in Redis for ``USER_CACHE_TTL`` seconds."""
    try:
        r = get_redis()
        key = f"user:{user.id}"
        await r.set(key, json.dumps(serialize(user)), ex=USER_CACHE_TTL)
    except Exception:
        # Redis is best-effort caching; never block the request.
        pass


async def _invalidate_user_cache(user_id: uuid.UUID) -> None:
    """Delete the cached user entry from Redis."""
    try:
        r = get_redis()
        await r.delete(f"user:{user_id}")
    except Exception:
        pass


async def _create_tokens_and_store(
    user: User,
    session: AsyncSession,
) -> tuple[str, str]:
    """Create access + refresh tokens and persist the refresh token."""
    user_id_str = str(user.id)
    access_token = create_access_token(user_id_str)
    refresh_token = create_refresh_token(user_id_str)

    rt = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=30),
    )
    session.add(rt)
    await session.commit()

    return access_token, refresh_token


async def _verify_sms_code(
    phone: str,
    code: str,
    session: AsyncSession,
) -> SmsCode:
    """Find and validate an SMS code.

    Raises
    ------
    HTTPException (400)
        When no matching, unused, non-expired code is found.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    stmt = (
        select(SmsCode)
        .where(
            SmsCode.phone == phone,
            SmsCode.code == code,
            SmsCode.used == False,  # noqa: E712 -- SQLAlchemy equality
            SmsCode.expires_at > now,
        )
        .order_by(SmsCode.created_at.desc())  # type: ignore[union-attr]
    )
    result = await session.exec(stmt)
    sms = result.first()

    if sms is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码无效或已过期",
        )
    return sms


def _build_login_response(
    access_token: str,
    refresh_token: str,
    user: User,
) -> dict:
    """Construct the standard login success payload."""
    return success_response(
        data={
            "token": access_token,
            "refreshToken": refresh_token,
            "expiresIn": ACCESS_TOKEN_EXPIRE_SECONDS,
            "user": serialize(user),
        },
        message="登录成功",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/wechat/login")
async def wechat_login(
    body: WechatLoginRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Exchange a WeChat ``wx.login()`` code for platform tokens.

    Creates a new user on first login; returns the existing user
    otherwise. Caches the user object in Redis for 1 hour.
    """
    try:
        wx_data = await code_to_session(body.code)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    open_id: str = wx_data["openid"]
    union_id: str | None = wx_data.get("unionid")

    # Find or create user
    stmt = select(User).where(User.open_id == open_id)
    result = await session.exec(stmt)
    user = result.first()

    if user is None:
        user = User(open_id=open_id, union_id=union_id)
        session.add(user)
        await session.commit()
        await session.refresh(user)
    elif union_id and user.union_id != union_id:
        user.union_id = union_id
        user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        session.add(user)
        await session.commit()
        await session.refresh(user)

    access_token, refresh_token = await _create_tokens_and_store(user, session)
    await _cache_user(user)

    return _build_login_response(access_token, refresh_token, user)


@router.post("/phone/login")
async def phone_login(
    body: PhoneLoginRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Login (or register) using a phone number and SMS verification code."""
    sms = await _verify_sms_code(body.phone, body.code, session)

    # Mark code as used
    sms.used = True
    session.add(sms)

    # Find or create user by phone
    stmt = select(User).where(User.phone == body.phone)
    result = await session.exec(stmt)
    user = result.first()

    if user is None:
        user = User(
            open_id=f"phone_{uuid.uuid4().hex[:16]}",
            phone=body.phone,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    else:
        await session.commit()

    access_token, refresh_token = await _create_tokens_and_store(user, session)
    await _cache_user(user)

    return _build_login_response(access_token, refresh_token, user)


@router.post("/phone/send-code")
async def send_code(
    body: SendCodeRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Generate and send a 6-digit SMS verification code.

    Rate-limited to one code per phone number every 60 seconds.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Rate-limit check: last code must be > 60 seconds ago
    rate_stmt = (
        select(SmsCode)
        .where(SmsCode.phone == body.phone)
        .order_by(SmsCode.created_at.desc())  # type: ignore[union-attr]
    )
    rate_result = await session.exec(rate_stmt)
    last_code = rate_result.first()

    if last_code and (now - last_code.created_at).total_seconds() < SMS_CODE_RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="发送验证码过于频繁，请稍后再试",
        )

    # Generate, persist, and send
    code = generate_sms_code()
    sms = SmsCode(
        phone=body.phone,
        code=code,
        expires_at=now + timedelta(seconds=SMS_CODE_EXPIRE_SECONDS),
    )
    session.add(sms)
    await session.commit()

    sent = await send_sms_code(body.phone, code)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="短信发送失败，请稍后再试",
        )

    return success_response(
        data={"expiresIn": SMS_CODE_EXPIRE_SECONDS},
        message="验证码已发送",
    )


@router.post("/phone/bind")
async def bind_phone(
    body: PhoneBindRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Bind a phone number to the currently authenticated user.

    Validates the SMS code and ensures the phone is not already
    associated with another account.
    """
    sms = await _verify_sms_code(body.phone, body.code, session)

    # Check phone uniqueness across other users
    stmt = select(User).where(User.phone == body.phone, User.id != current_user.id)
    result = await session.exec(stmt)
    existing = result.first()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该手机号已被其他账号绑定",
        )

    # Mark code as used and update user
    sms.used = True
    session.add(sms)

    current_user.phone = body.phone
    current_user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    await _invalidate_user_cache(current_user.id)

    return success_response(
        data={"phone": current_user.phone},
        message="手机号绑定成功",
    )


@router.post("/refresh")
async def refresh_token_endpoint(
    body: RefreshTokenRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Issue a new access token using a valid refresh token."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Look up refresh token in DB
    stmt = select(RefreshToken).where(RefreshToken.token == body.refresh_token)
    result = await session.exec(stmt)
    rt = result.first()

    if rt is None or rt.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="刷新令牌无效或已过期",
        )

    # Decode to extract user_id (also validates signature + expiry)
    try:
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="刷新令牌无效或已过期",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="刷新令牌无效",
        )

    new_access_token = create_access_token(user_id)

    return success_response(
        data={
            "token": new_access_token,
            "expiresIn": ACCESS_TOKEN_EXPIRE_SECONDS,
        },
        message="令牌刷新成功",
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Log out by deleting all refresh tokens and clearing the user cache."""
    # Delete all refresh tokens for this user
    stmt = select(RefreshToken).where(RefreshToken.user_id == current_user.id)
    result = await session.exec(stmt)
    tokens = result.all()
    for token in tokens:
        await session.delete(token)
    await session.commit()

    await _invalidate_user_cache(current_user.id)

    return success_response(data=None, message="已退出登录")

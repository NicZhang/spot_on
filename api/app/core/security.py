"""JWT token creation and verification.

Uses python-jose with HS256 for signing. Access tokens expire in
``JWT_ACCESS_TOKEN_EXPIRE_DAYS`` days and refresh tokens in
``JWT_REFRESH_TOKEN_EXPIRE_DAYS`` days (both configurable via Settings).
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(user_id: str) -> str:
    """Create a short-lived access token for *user_id*.

    The ``sub`` claim carries the user id.  ``exp`` is set to
    ``JWT_ACCESS_TOKEN_EXPIRE_DAYS`` days from now (UTC).
    """
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived refresh token for *user_id*.

    ``exp`` is set to ``JWT_REFRESH_TOKEN_EXPIRE_DAYS`` days from now (UTC).
    """
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT, returning its payload dict.

    Raises ``JWTError`` on any validation failure (expired, bad
    signature, malformed, etc.).
    """
    try:
        payload: dict = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("sub") is None:
            raise JWTError("Token missing 'sub' claim")
        return payload
    except JWTError:
        raise

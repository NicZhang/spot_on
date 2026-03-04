"""FastAPI dependency injection for authentication and authorisation.

All dependencies use ``Depends()`` chaining so they can be composed in
endpoint signatures with minimal boiler-plate.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.core.security import decode_token
from app.models.team import Team
from app.models.user import User

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Extract the authenticated user from the JWT Bearer token.

    Returns the ``User`` model instance.  Raises ``401`` when the token
    is missing, expired, or references a non-existent user.
    """
    try:
        payload = decode_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证凭据",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    statement = select(User).where(User.id == user_id)
    result = await session.exec(statement)
    user = result.first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
        )
    return user


async def require_captain(
    user: User = Depends(get_current_user),
) -> User:
    """Ensure the current user has a captain role (FREE or VIP).

    Raises ``403`` if the user is a regular player.
    """
    if user.role not in ("FREE_CAPTAIN", "VIP_CAPTAIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="仅队长可执行此操作",
        )
    return user


async def require_vip(
    user: User = Depends(get_current_user),
) -> User:
    """Ensure the current user is a VIP captain.

    Raises ``403`` if the user does not hold the VIP_CAPTAIN role.
    """
    if user.role != "VIP_CAPTAIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="仅VIP队长可执行此操作",
        )
    return user


async def get_current_team(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Team:
    """Return the team that the current user has selected.

    Raises ``400`` if the user has not set ``current_team_id``, or
    ``404`` if the team no longer exists.
    """
    if user.current_team_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先选择一个球队",
        )

    statement = select(Team).where(Team.id == user.current_team_id)
    result = await session.exec(statement)
    team = result.first()

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="球队不存在",
        )
    return team

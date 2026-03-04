"""User-related models: User, RefreshToken, SmsCode."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal


def _utcnow() -> datetime:
    """Return current UTC time as naive datetime (for TIMESTAMP WITHOUT TIME ZONE columns)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """Platform user (player or captain)."""

    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    open_id: str = Field(max_length=128, sa_column_kwargs={"unique": True, "nullable": False})
    union_id: str | None = Field(default=None, max_length=128)
    phone: str | None = Field(default=None, max_length=20, sa_column_kwargs={"unique": True})
    name: str = Field(default="新用户", max_length=50)
    avatar: str = Field(default="")
    gender: str = Field(default="unknown", max_length=10)
    role: str = Field(default="PLAYER", max_length=20)
    goals: int = Field(default=0)
    assists: int = Field(default=0)
    mvp_count: int = Field(default=0)
    appearances: int = Field(default=0)
    balance: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    current_team_id: uuid.UUID | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class RefreshToken(SQLModel, table=True):
    """JWT refresh token storage."""

    __tablename__ = "refresh_tokens"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    token: str = Field(max_length=500, sa_column_kwargs={"unique": True, "nullable": False})
    expires_at: datetime
    created_at: datetime = Field(default_factory=_utcnow)


class SmsCode(SQLModel, table=True):
    """SMS verification code."""

    __tablename__ = "sms_codes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    phone: str = Field(max_length=20)
    code: str = Field(max_length=6)
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow)

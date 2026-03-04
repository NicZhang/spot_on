"""Team-related models: Team, CreditHistory, TeamVerification, TeamReport, TeamInvite."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


class Team(SQLModel, table=True):
    """Football team."""

    __tablename__ = "teams"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=30)
    logo: str = Field(default="")
    gender: str = Field(default="male", max_length=10)
    avg_age: Decimal = Field(default=Decimal("0"), max_digits=4, decimal_places=1)
    credit_score: int = Field(default=100)
    win_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    tags: Any = Field(default=[], sa_column=Column(JSON, nullable=False, server_default="[]"))
    location: str = Field(default="", max_length=100)
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)
    is_verified: bool = Field(default=False)
    home_jersey_color: str | None = Field(default=None, max_length=10)
    away_jersey_color: str | None = Field(default=None, max_length=10)
    fund_balance: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    announcement: str | None = Field(default=None)
    captain_id: uuid.UUID = Field(foreign_key="users.id")
    member_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class CreditHistory(SQLModel, table=True):
    """Credit score change log for a team."""

    __tablename__ = "credit_history"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(foreign_key="teams.id")
    change: int
    reason: str = Field(max_length=200)
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class TeamVerification(SQLModel, table=True):
    """Team identity verification submission."""

    __tablename__ = "team_verifications"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(foreign_key="teams.id")
    real_name: str = Field(max_length=50)
    id_card: str = Field(max_length=18)
    phone: str = Field(max_length=20)
    description: str | None = Field(default=None)
    id_front_image_id: str = Field(max_length=200)
    id_back_image_id: str = Field(max_length=200)
    team_photo_image_id: str | None = Field(default=None, max_length=200)
    status: str = Field(default="reviewing", max_length=20)
    reject_reason: str | None = Field(default=None)
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    reviewed_at: datetime | None = Field(default=None)


class TeamReport(SQLModel, table=True):
    """Report against a team."""

    __tablename__ = "team_reports"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(foreign_key="teams.id")
    reporter_id: uuid.UUID = Field(foreign_key="users.id")
    reason: str = Field(max_length=50)
    description: str | None = Field(default=None)
    status: str = Field(default="pending", max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class TeamInvite(SQLModel, table=True):
    """Team invitation link / QR code."""

    __tablename__ = "team_invites"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(foreign_key="teams.id")
    invite_code: str = Field(max_length=20, sa_column_kwargs={"unique": True, "nullable": False})
    qr_code: str | None = Field(default=None)
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

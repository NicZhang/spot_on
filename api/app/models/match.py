"""Match-related models: MatchRequest, MatchRecord."""

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


class MatchRequest(SQLModel, table=True):
    """A request published by a team looking for an opponent."""

    __tablename__ = "match_requests"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    host_team_id: uuid.UUID = Field(foreign_key="teams.id")
    guest_team_id: uuid.UUID | None = Field(default=None, foreign_key="teams.id")
    date: date
    time: time
    duration: int
    location: str = Field(max_length=200)
    field_name: str | None = Field(default=None, max_length=50)
    format: str = Field(max_length=20)
    latitude: float | None = Field(default=None)
    longitude: float | None = Field(default=None)
    intensity: str = Field(max_length=20)
    gender_req: str = Field(default="any", max_length=10)
    jersey_color: str = Field(default="#FF0000", max_length=10)
    pitch_fee: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    referee_fee: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    water_fee: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    total_price: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    amenities: Any = Field(default=[], sa_column=Column(JSON, nullable=False, server_default="[]"))
    video_service: bool = Field(default=False)
    insurance_player_ids: Any = Field(
        default=[], sa_column=Column(JSON, nullable=False, server_default="[]")
    )
    urgent_top: bool = Field(default=False)
    memo: str | None = Field(default=None)
    status: str = Field(default="open", max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class MatchRecord(SQLModel, table=True):
    """Completed or scheduled match record."""

    __tablename__ = "match_records"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    match_request_id: uuid.UUID | None = Field(default=None, foreign_key="match_requests.id")
    host_team_id: uuid.UUID = Field(foreign_key="teams.id")
    guest_team_id: uuid.UUID = Field(foreign_key="teams.id")
    host_team_score: int | None = Field(default=None)
    guest_team_score: int | None = Field(default=None)
    date: date
    time: time
    location: str = Field(max_length=200)
    format: str = Field(max_length=20)
    duration: int
    status: str = Field(default="upcoming", max_length=30)
    report: Any = Field(default=None, sa_column=Column(JSON, nullable=True))
    total_fee: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    fee_per_player: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

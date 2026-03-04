"""Player model: membership of a user in a team."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Player(SQLModel, table=True):
    """A user's membership record in a specific team."""

    __tablename__ = "players"
    __table_args__ = (UniqueConstraint("team_id", "user_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(foreign_key="teams.id")
    user_id: uuid.UUID = Field(foreign_key="users.id")
    name: str = Field(max_length=50)
    number: int = Field(default=0)
    position: str = Field(default="", max_length=10)
    avatar: str = Field(default="")
    height: int | None = Field(default=None)
    weight: int | None = Field(default=None)
    strong_foot: str | None = Field(default=None, max_length=10)
    level: str | None = Field(default=None, max_length=20)
    phone: str | None = Field(default=None, max_length=20)
    goals: int = Field(default=0)
    assists: int = Field(default=0)
    mvp_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

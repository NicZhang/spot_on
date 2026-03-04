"""Billing models: Bill, BillPlayer."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Bill(SQLModel, table=True):
    """AA billing record for a match."""

    __tablename__ = "bills"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    match_record_id: uuid.UUID = Field(foreign_key="match_records.id")
    team_id: uuid.UUID = Field(foreign_key="teams.id")
    title: str = Field(max_length=200)
    date: date
    total_amount: Decimal = Field(max_digits=10, decimal_places=2)
    per_head: Decimal = Field(max_digits=10, decimal_places=2)
    paid_count: int = Field(default=0)
    total_count: int = Field(default=0)
    status: str = Field(default="collecting", max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class BillPlayer(SQLModel, table=True):
    """Individual player payment status within a bill."""

    __tablename__ = "bill_players"
    __table_args__ = (UniqueConstraint("bill_id", "player_id"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    bill_id: uuid.UUID = Field(foreign_key="bills.id")
    player_id: uuid.UUID = Field(foreign_key="players.id")
    status: str = Field(default="unpaid", max_length=10)
    paid_at: datetime | None = Field(default=None)

"""Transaction model: team fund income/expense records."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel


class Transaction(SQLModel, table=True):
    """Financial transaction for a team fund."""

    __tablename__ = "transactions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(foreign_key="teams.id")
    type: str = Field(max_length=10)
    amount: Decimal = Field(max_digits=10, decimal_places=2)
    description: str = Field(default="", max_length=500)
    category: str = Field(default="", max_length=50)
    related_match_id: uuid.UUID | None = Field(default=None)
    operator: uuid.UUID = Field(foreign_key="users.id")
    date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

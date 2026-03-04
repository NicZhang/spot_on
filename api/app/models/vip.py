"""VIP subscription models: VipPlan, VipSubscription."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel


class VipPlan(SQLModel, table=True):
    """Available VIP membership plan."""

    __tablename__ = "vip_plans"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=50, sa_column_kwargs={"unique": True, "nullable": False})
    display_name: str = Field(max_length=50)
    price: Decimal = Field(max_digits=10, decimal_places=2)
    duration_days: int
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class VipSubscription(SQLModel, table=True):
    """A user's active or expired VIP subscription."""

    __tablename__ = "vip_subscriptions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    plan_id: uuid.UUID = Field(foreign_key="vip_plans.id")
    status: str = Field(default="active", max_length=20)
    start_date: datetime
    end_date: datetime
    auto_renew: bool = Field(default=True)
    payment_method: str = Field(max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

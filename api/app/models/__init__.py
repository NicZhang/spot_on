"""Import all models so SQLModel.metadata registers every table."""

from app.models.bill import Bill, BillPlayer  # noqa: F401
from app.models.chat import ChatMessage, ChatSession  # noqa: F401
from app.models.match import MatchRecord, MatchRequest  # noqa: F401
from app.models.player import Player  # noqa: F401
from app.models.team import (  # noqa: F401
    CreditHistory,
    Team,
    TeamInvite,
    TeamReport,
    TeamVerification,
)
from app.models.transaction import Transaction  # noqa: F401
from app.models.user import RefreshToken, SmsCode, User  # noqa: F401
from app.models.vip import VipPlan, VipSubscription  # noqa: F401

__all__ = [
    "User",
    "RefreshToken",
    "SmsCode",
    "Team",
    "CreditHistory",
    "TeamVerification",
    "TeamReport",
    "TeamInvite",
    "Player",
    "MatchRequest",
    "MatchRecord",
    "Bill",
    "BillPlayer",
    "Transaction",
    "ChatSession",
    "ChatMessage",
    "VipPlan",
    "VipSubscription",
]

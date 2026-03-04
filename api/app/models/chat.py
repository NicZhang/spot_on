"""Chat models: ChatSession, ChatMessage."""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import BigInteger, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


class ChatSession(SQLModel, table=True):
    """A chat conversation (1-on-1 or AI assistant)."""

    __tablename__ = "chat_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    participants: Any = Field(
        default=[], sa_column=Column(JSONB, nullable=False, server_default="[]")
    )
    name: str = Field(default="", max_length=100)
    avatar: str = Field(default="")
    last_message: str = Field(default="")
    last_time: datetime | None = Field(default=None)
    unread_count: int = Field(default=0)
    is_ai: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class ChatMessage(SQLModel, table=True):
    """A single message in a chat session."""

    __tablename__ = "chat_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="chat_sessions.id")
    sender_id: uuid.UUID = Field(foreign_key="users.id")
    text: str = Field(default="")
    timestamp: int = Field(sa_column=Column(BigInteger, nullable=False))  # Unix ms
    type: str = Field(default="text", max_length=10)
    card_data: Any = Field(default=None, sa_column=Column(JSON, nullable=True))
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

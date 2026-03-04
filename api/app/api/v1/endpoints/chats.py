"""Chat endpoints: sessions list, messages CRUD, session deletion.

All responses use the unified envelope from ``app.core.response``.
Redis caching is applied to the session list; cache is invalidated on writes.
"""

import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlmodel import delete, func, select, update
from sqlmodel.ext.asyncio.session import AsyncSession

import redis.asyncio as aioredis

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.core.response import paginated_response, success_response
from app.core.serializers import serialize
from app.models.chat import ChatMessage, ChatSession
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------
class MessageCreate(BaseModel):
    """Body schema for sending a new chat message."""

    model_config = ConfigDict(from_attributes=True)

    type: str = "text"
    text: str
    cardData: dict | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _get_session_or_404(
    session_id: uuid.UUID,
    session: AsyncSession,
) -> ChatSession:
    """Return a ChatSession by id or raise 404."""
    stmt = select(ChatSession).where(ChatSession.id == session_id)
    result = await session.exec(stmt)
    chat_session = result.first()
    if not chat_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")
    return chat_session


def _is_participant(chat_session: ChatSession, user_id: uuid.UUID) -> bool:
    """Check whether *user_id* is listed in the session's participants."""
    participants: list = chat_session.participants or []
    return str(user_id) in participants


# ---------------------------------------------------------------------------
# GET /chats
# ---------------------------------------------------------------------------
@router.get("")
async def list_chat_sessions(
    page: int = 1,
    pageSize: int = 20,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Return paginated chat sessions the current user participates in.

    Results are cached in Redis for 1 minute.
    """
    uid_str = str(user.id)
    cache_key = f"chats:{uid_str}:{page}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # JSONB containment: participants @> '["<user_id>"]'::jsonb
    uid_json = json.dumps([uid_str])
    containment_clause = text("participants @> :uid ::jsonb").bindparams(uid=uid_json)

    # Count
    count_stmt = (
        select(func.count())
        .select_from(ChatSession)
        .where(containment_clause)
    )
    total_result = await session.exec(count_stmt)
    total: int = total_result.one()

    # Data
    data_stmt = (
        select(ChatSession)
        .where(containment_clause)
        .order_by(ChatSession.last_time.desc())  # type: ignore[union-attr]
        .offset((page - 1) * pageSize)
        .limit(pageSize)
    )
    sessions_result = await session.exec(data_stmt)
    sessions = sessions_result.all()

    items = [serialize(s) for s in sessions]

    response = paginated_response(items=items, total=total, page=page, page_size=pageSize)

    # Cache for 1 minute
    await redis.set(cache_key, json.dumps(response), ex=60)
    return response


# ---------------------------------------------------------------------------
# GET /chats/{session_id}/messages
# ---------------------------------------------------------------------------
@router.get("/{session_id}/messages")
async def list_messages(
    session_id: uuid.UUID,
    page: int = 1,
    pageSize: int = 50,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return paginated messages for *session_id* (newest first).

    Marks all unread messages from other senders as read and resets
    the session's ``unread_count`` to 0.
    """
    chat_session = await _get_session_or_404(session_id, session)
    if not _is_participant(chat_session, user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您不是该会话的参与者")

    # Count
    count_stmt = (
        select(func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.session_id == session_id)
    )
    total_result = await session.exec(count_stmt)
    total: int = total_result.one()

    # Data (newest first)
    data_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.desc())  # type: ignore[union-attr]
        .offset((page - 1) * pageSize)
        .limit(pageSize)
    )
    msg_result = await session.exec(data_stmt)
    messages = msg_result.all()

    items = [serialize(m) for m in messages]

    # Mark unread messages from other senders as read
    mark_read_stmt = (
        update(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.sender_id != user.id,
            ChatMessage.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    await session.exec(mark_read_stmt)  # type: ignore[arg-type]

    # Reset session unread_count
    chat_session.unread_count = 0
    chat_session.updated_at = datetime.now(timezone.utc)
    session.add(chat_session)

    await session.commit()

    return paginated_response(items=items, total=total, page=page, page_size=pageSize)


# ---------------------------------------------------------------------------
# POST /chats/{session_id}/messages
# ---------------------------------------------------------------------------
@router.post("/{session_id}/messages")
async def create_message(
    session_id: uuid.UUID,
    body: MessageCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Send a new message in *session_id*.

    Updates session metadata (``last_message``, ``last_time``,
    ``unread_count``) and invalidates the chat-list cache.
    """
    chat_session = await _get_session_or_404(session_id, session)
    if not _is_participant(chat_session, user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您不是该会话的参与者")

    now = datetime.now(timezone.utc)
    timestamp_ms = int(time.time() * 1000)

    message = ChatMessage(
        session_id=session_id,
        sender_id=user.id,
        text=body.text,
        timestamp=timestamp_ms,
        type=body.type,
        card_data=body.cardData,
        is_read=False,
        created_at=now,
    )
    session.add(message)

    # Update session metadata
    chat_session.last_message = body.text[:200] if body.text else ""
    chat_session.last_time = now
    chat_session.unread_count += 1
    chat_session.updated_at = now
    session.add(chat_session)

    await session.commit()
    await session.refresh(message)

    # Invalidate chat list cache for all participants
    for uid in chat_session.participants or []:
        async for key in redis.scan_iter(f"chats:{uid}:*"):
            await redis.delete(key)

    return success_response(data=serialize(message), message="消息发送成功")


# ---------------------------------------------------------------------------
# DELETE /chats/{session_id}
# ---------------------------------------------------------------------------
@router.delete("/{session_id}")
async def delete_chat_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Delete a chat session and all its messages.

    Only participants may delete a session.
    """
    chat_session = await _get_session_or_404(session_id, session)
    if not _is_participant(chat_session, user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您不是该会话的参与者")

    # Delete all messages first
    del_msgs_stmt = delete(ChatMessage).where(ChatMessage.session_id == session_id)
    await session.exec(del_msgs_stmt)  # type: ignore[arg-type]

    # Delete the session
    await session.delete(chat_session)
    await session.commit()

    # Invalidate chat list cache for all participants
    for uid in chat_session.participants or []:
        async for key in redis.scan_iter(f"chats:{uid}:*"):
            await redis.delete(key)

    return success_response(data=None, message="会话已删除")

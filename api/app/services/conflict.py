"""Time conflict checker for match scheduling.

Prevents a team from accepting a match that overlaps with an existing
upcoming or in-progress match by more than 30 minutes.
"""

import uuid
from datetime import date as date_type
from datetime import datetime, time as time_type, timedelta

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.match import MatchRecord


async def check_time_conflict(
    session: AsyncSession,
    team_id: uuid.UUID,
    match_date: date_type,
    match_time: time_type,
    duration: int,
    exclude_record_id: uuid.UUID | None = None,
) -> dict | None:
    """Check if *team_id* already has a match that overlaps the proposed slot.

    A conflict is detected when the overlap exceeds 30 minutes.

    Args:
        session: Async database session.
        team_id: The team to check for conflicts.
        match_date: Proposed match date.
        match_time: Proposed match start time.
        duration: Proposed match duration in minutes.
        exclude_record_id: Optional record id to skip (useful when editing).

    Returns:
        A dict describing the conflicting match, or ``None`` if no conflict.
    """
    new_start = datetime.combine(match_date, match_time)
    new_end = new_start + timedelta(minutes=duration)

    stmt = select(MatchRecord).where(
        (
            (MatchRecord.host_team_id == team_id)
            | (MatchRecord.guest_team_id == team_id)
        ),
        MatchRecord.status.in_(["upcoming", "pending_report"]),  # type: ignore[union-attr]
    )
    if exclude_record_id is not None:
        stmt = stmt.where(MatchRecord.id != exclude_record_id)

    result = await session.exec(stmt)
    for record in result.all():
        existing_start = datetime.combine(record.date, record.time)
        existing_end = existing_start + timedelta(minutes=record.duration)

        overlap_start = max(new_start, existing_start)
        overlap_end = min(new_end, existing_end)
        overlap_minutes = max(0, (overlap_end - overlap_start).total_seconds() / 60)

        if overlap_minutes > 30:
            return {
                "id": str(record.id),
                "date": str(record.date),
                "time": record.time.strftime("%H:%M"),
                "location": record.location,
            }

    return None

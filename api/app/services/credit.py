"""Credit score service for team trust/reputation system.

Manages credit changes triggered by match completion, cancellation, and
other trust-related events.  All mutations are recorded in the
``credit_history`` table.
"""

import uuid
from datetime import datetime, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.match import MatchRecord
from app.models.team import CreditHistory, Team


async def record_credit_change(
    session: AsyncSession,
    team_id: uuid.UUID,
    change: int,
    reason: str,
) -> None:
    """Apply *change* to the team's credit score and persist a history entry.

    The score is clamped to the ``[0, 100]`` range.
    """
    team = await session.get(Team, team_id)
    if not team:
        return

    team.credit_score = max(0, min(100, team.credit_score + change))
    history = CreditHistory(team_id=team_id, change=change, reason=reason)
    session.add(history)


async def credit_for_completion(
    session: AsyncSession,
    team_id: uuid.UUID,
) -> int:
    """Award credit points for completing a match.

    A base of +2 is given.  Consecutive completion streaks earn bonuses:
    - 5+ consecutive finished matches: +10 bonus
    - 3+ consecutive finished matches: +5 bonus

    Returns:
        The total credit change applied.
    """
    change = 2  # base award

    # Check recent consecutive finished matches for streak bonus
    stmt = (
        select(MatchRecord)
        .where(
            (
                (MatchRecord.host_team_id == team_id)
                | (MatchRecord.guest_team_id == team_id)
            ),
            MatchRecord.status == "finished",
        )
        .order_by(MatchRecord.updated_at.desc())  # type: ignore[union-attr]
        .limit(5)
    )
    result = await session.exec(stmt)
    consecutive = len(result.all())

    if consecutive >= 5:
        change += 10
    elif consecutive >= 3:
        change += 5

    await record_credit_change(session, team_id, change, "完成比赛")
    return change


async def credit_for_cancellation(
    session: AsyncSession,
    team_id: uuid.UUID,
    match_datetime: datetime,
) -> int:
    """Deduct credit for cancelling a matched game based on how close the
    cancellation is to the kick-off time.

    Penalty tiers:
    - >= 24 h before: no penalty
    - 6-24 h before: -10
    - < 6 h before: -20

    Returns:
        The credit change (negative) or 0 if no penalty.
    """
    now = datetime.now(timezone.utc)
    hours_before = (match_datetime - now).total_seconds() / 3600

    if hours_before >= 24:
        return 0
    elif hours_before >= 6:
        change = -10
        reason = "临期取消（赛前6-24h）"
    else:
        change = -20
        reason = "紧急取消（赛前6h内）"

    await record_credit_change(session, team_id, change, reason)
    return change

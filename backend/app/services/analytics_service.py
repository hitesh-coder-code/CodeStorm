from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.journal_entry import JournalEntry
from app.schemas.analytics import (
    JournalStatsResponse,
    MoodSummaryResponse,
    MoodTrendPoint,
)


MOOD_LABELS = (
    "happy",
    "calm",
    "neutral",
    "anxious",
    "sad",
    "stressed",
    "angry",
)


def get_user_entries(
    db: Session,
    user_id: int,
) -> list[JournalEntry]:
    statement = (
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.created_at.asc())
    )

    return list(db.scalars(statement).all())


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def calculate_mood_summary(
    db: Session,
    user_id: int,
) -> MoodSummaryResponse:
    entries = get_user_entries(db, user_id)

    counts = {
        mood_label: 0
        for mood_label in MOOD_LABELS
    }

    for entry in entries:
        if entry.mood_label in counts:
            counts[entry.mood_label] += 1

    return MoodSummaryResponse(**counts)


def calculate_mood_trend(
    db: Session,
    user_id: int,
) -> list[MoodTrendPoint]:
    entries = get_user_entries(db, user_id)

    scores_by_date: dict[date, list[int]] = defaultdict(list)

    for entry in entries:
        if entry.mood_score is None:
            continue

        created_at = normalize_datetime(entry.created_at)
        scores_by_date[created_at.date()].append(entry.mood_score)

    trend: list[MoodTrendPoint] = []

    for entry_date in sorted(scores_by_date):
        scores = scores_by_date[entry_date]

        average_score = round(
            sum(scores) / len(scores),
            2,
        )

        trend.append(
            MoodTrendPoint(
                date=entry_date,
                average_mood_score=average_score,
                entry_count=len(scores),
            )
        )

    return trend


def calculate_journal_stats(
    db: Session,
    user_id: int,
) -> JournalStatsResponse:
    entries = get_user_entries(db, user_id)

    now = datetime.now(timezone.utc)

    start_of_week = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    start_of_month = now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    entries_this_week = 0
    entries_this_month = 0
    favorite_count = 0

    mood_scores: list[int] = []
    mood_counter: Counter[str] = Counter()

    for entry in entries:
        created_at = normalize_datetime(entry.created_at)

        if created_at >= start_of_week:
            entries_this_week += 1

        if created_at >= start_of_month:
            entries_this_month += 1

        if entry.is_favorite:
            favorite_count += 1

        if entry.mood_score is not None:
            mood_scores.append(entry.mood_score)

        if entry.mood_label:
            mood_counter[entry.mood_label] += 1

    most_common_mood: str | None = None

    if mood_counter:
        most_common_mood = mood_counter.most_common(1)[0][0]

    average_mood_score: float | None = None

    if mood_scores:
        average_mood_score = round(
            sum(mood_scores) / len(mood_scores),
            2,
        )

    return JournalStatsResponse(
        total_journal_entries=len(entries),
        entries_this_week=entries_this_week,
        entries_this_month=entries_this_month,
        most_common_mood=most_common_mood,
        average_mood_score=average_mood_score,
        favorite_entry_count=favorite_count,
    )
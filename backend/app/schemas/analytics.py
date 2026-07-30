from datetime import date

from pydantic import BaseModel


class MoodSummaryResponse(BaseModel):
    happy: int = 0
    calm: int = 0
    neutral: int = 0
    anxious: int = 0
    sad: int = 0
    stressed: int = 0
    angry: int = 0


class MoodTrendPoint(BaseModel):
    date: date
    average_mood_score: float
    entry_count: int


class JournalStatsResponse(BaseModel):
    total_journal_entries: int
    entries_this_week: int
    entries_this_month: int
    most_common_mood: str | None
    average_mood_score: float | None
    favorite_entry_count: int
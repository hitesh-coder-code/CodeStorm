from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    title: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    original_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    transcript: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reflection_questions: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    mood_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    mood_label: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    mood_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    entry_source: Mapped[str] = mapped_column(
        String(20),
        default="typed",
        nullable=False,
    )

    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
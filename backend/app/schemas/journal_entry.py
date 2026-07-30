from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MoodLabel(str, Enum):
    happy = "happy"
    calm = "calm"
    neutral = "neutral"
    anxious = "anxious"
    sad = "sad"
    stressed = "stressed"
    angry = "angry"


class EntrySource(str, Enum):
    typed = "typed"
    audio = "audio"
    imported = "imported"


class JournalCreate(BaseModel):
    title: str | None = Field(
        default=None,
        max_length=150,
    )

    original_text: str = Field(
        min_length=1,
        max_length=10000,
    )

    transcript: str | None = Field(
        default=None,
        max_length=10000,
    )

    reflection_questions: list[str] = Field(
        default_factory=list,
        max_length=10,
    )

    mood_summary: str | None = Field(
        default=None,
        max_length=500,
    )

    mood_label: MoodLabel | None = None

    mood_score: int | None = Field(
        default=None,
        ge=1,
        le=10,
    )

    entry_source: EntrySource = EntrySource.typed

    is_favorite: bool = False

    @field_validator("original_text")
    @classmethod
    def validate_original_text(cls, value: str) -> str:
        cleaned_value = value.strip()

        if not cleaned_value:
            raise ValueError("Journal text cannot be empty.")

        return cleaned_value


class JournalUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        max_length=150,
    )

    original_text: str | None = Field(
        default=None,
        min_length=1,
        max_length=10000,
    )

    transcript: str | None = Field(
        default=None,
        max_length=10000,
    )

    reflection_questions: list[str] | None = Field(
        default=None,
        max_length=10,
    )

    mood_summary: str | None = Field(
        default=None,
        max_length=500,
    )

    mood_label: MoodLabel | None = None

    mood_score: int | None = Field(
        default=None,
        ge=1,
        le=10,
    )

    entry_source: EntrySource | None = None

    is_favorite: bool | None = None


class JournalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str | None
    original_text: str
    transcript: str | None
    reflection_questions: list[str]
    mood_summary: str | None
    mood_label: str | None
    mood_score: int | None
    entry_source: str
    is_favorite: bool
    created_at: datetime
    updated_at: datetime
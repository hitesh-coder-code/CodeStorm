from pydantic import BaseModel, Field


class ReflectionRequest(BaseModel):
    journal_text: str = Field(
        min_length=1,
        max_length=10000,
    )

    mood: str | None = Field(
        default=None,
        max_length=30,
    )


class ReflectionResponse(BaseModel):
    reflection: str
    urgent_support: bool
    model: str
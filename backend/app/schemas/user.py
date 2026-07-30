from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class UserCreate(BaseModel):
    email: EmailStr

    username: str = Field(
        min_length=3,
        max_length=50,
    )

    password: str = Field(
        min_length=8,
        max_length=72,
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        cleaned_value = value.strip()

        if not cleaned_value:
            raise ValueError("Username cannot be empty.")

        if not cleaned_value.replace("_", "").isalnum():
            raise ValueError(
                "Username can contain only letters, numbers and underscores."
            )

        return cleaned_value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    username: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
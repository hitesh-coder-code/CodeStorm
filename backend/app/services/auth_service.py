from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


def get_user_by_email(
    db: Session,
    email: str,
) -> User | None:
    statement = select(User).where(
        User.email == email.lower()
    )

    return db.scalar(statement)


def get_user_by_username(
    db: Session,
    username: str,
) -> User | None:
    statement = select(User).where(
        User.username == username
    )

    return db.scalar(statement)


def create_user(
    db: Session,
    user_data: UserCreate,
) -> User:
    user = User(
        email=str(user_data.email).lower(),
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(
    db: Session,
    identifier: str,
    password: str,
) -> User | None:
    cleaned_identifier = identifier.strip()

    statement = select(User).where(
        or_(
            User.username == cleaned_identifier,
            User.email == cleaned_identifier.lower(),
        )
    )

    user = db.scalar(statement)

    if user is None:
        return None

    if not user.is_active:
        return None

    if not verify_password(
        password,
        user.hashed_password,
    ):
        return None

    return user
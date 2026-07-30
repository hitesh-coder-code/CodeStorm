from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.journal_entry import JournalEntry
from app.models.user import User
from app.schemas.journal_entry import (
    JournalCreate,
    JournalListResponse,
    JournalResponse,
    JournalUpdate,
    MoodLabel,
)


router = APIRouter(
    prefix="/api/v1/journals",
    tags=["Journals"],
)


def get_owned_journal(
    db: Session,
    entry_id: int,
    user_id: int,
) -> JournalEntry | None:
    statement = select(JournalEntry).where(
        JournalEntry.id == entry_id,
        JournalEntry.user_id == user_id,
    )

    return db.scalar(statement)


@router.post(
    "",
    response_model=JournalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create journal entry",
)
def create_journal(
    journal_data: JournalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JournalEntry:
    values = journal_data.model_dump(mode="json")

    journal = JournalEntry(
        **values,
        user_id=current_user.id,
    )

    db.add(journal)
    db.commit()
    db.refresh(journal)

    return journal


@router.get(
    "",
    response_model=JournalListResponse,
    summary="List current user's journals",
)
def list_journals(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    mood_label: MoodLabel | None = None,
    is_favorite: bool | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    sort: Literal["newest", "oldest"] = "newest",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JournalListResponse:
    if (
        start_date is not None
        and end_date is not None
        and end_date < start_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be earlier than start date.",
        )

    filters = [
        JournalEntry.user_id == current_user.id,
    ]

    if search:
        cleaned_search = search.strip()

        if cleaned_search:
            pattern = f"%{cleaned_search}%"

            filters.append(
                or_(
                    JournalEntry.title.ilike(pattern),
                    JournalEntry.original_text.ilike(pattern),
                )
            )

    if mood_label is not None:
        filters.append(
            JournalEntry.mood_label == mood_label.value
        )

    if is_favorite is not None:
        filters.append(
            JournalEntry.is_favorite == is_favorite
        )

    if start_date is not None:
        start_datetime = datetime.combine(
            start_date,
            time.min,
            tzinfo=timezone.utc,
        )

        filters.append(
            JournalEntry.created_at >= start_datetime
        )

    if end_date is not None:
        end_datetime = datetime.combine(
            end_date + timedelta(days=1),
            time.min,
            tzinfo=timezone.utc,
        )

        filters.append(
            JournalEntry.created_at < end_datetime
        )

    total_statement = (
        select(func.count(JournalEntry.id))
        .where(*filters)
    )

    total = db.scalar(total_statement) or 0

    order_column = (
        JournalEntry.created_at.asc()
        if sort == "oldest"
        else JournalEntry.created_at.desc()
    )

    offset = (page - 1) * page_size

    statement = (
        select(JournalEntry)
        .where(*filters)
        .order_by(order_column)
        .offset(offset)
        .limit(page_size)
    )

    items = list(db.scalars(statement).all())

    return JournalListResponse(
        page=page,
        page_size=page_size,
        total=total,
        items=items,
    )


@router.get(
    "/{entry_id}",
    response_model=JournalResponse,
)
def get_journal(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JournalEntry:
    journal = get_owned_journal(
        db=db,
        entry_id=entry_id,
        user_id=current_user.id,
    )

    if journal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        )

    return journal


@router.patch(
    "/{entry_id}",
    response_model=JournalResponse,
)
def update_journal(
    entry_id: int,
    journal_data: JournalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JournalEntry:
    journal = get_owned_journal(
        db=db,
        entry_id=entry_id,
        user_id=current_user.id,
    )

    if journal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        )

    update_values = journal_data.model_dump(
        exclude_unset=True,
        mode="json",
    )

    for field_name, value in update_values.items():
        setattr(journal, field_name, value)

    db.commit()
    db.refresh(journal)

    return journal


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_journal(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    journal = get_owned_journal(
        db=db,
        entry_id=entry_id,
        user_id=current_user.id,
    )

    if journal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        )

    db.delete(journal)
    db.commit()

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )
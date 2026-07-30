from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.journal_entry import JournalEntry
from app.schemas.journal_entry import (
    JournalCreate,
    JournalResponse,
    JournalUpdate,
)


router = APIRouter(
    prefix="/api/v1/journals",
    tags=["Journals"],
)


@router.post(
    "",
    response_model=JournalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_journal(
    journal_data: JournalCreate,
    db: Session = Depends(get_db),
) -> JournalEntry:
    new_journal = JournalEntry(
        title=journal_data.title,
        original_text=journal_data.original_text,
        transcript=journal_data.transcript,
        reflection_questions=journal_data.reflection_questions,
        mood_summary=journal_data.mood_summary,
        mood_label=(
            journal_data.mood_label.value
            if journal_data.mood_label
            else None
        ),
        mood_score=journal_data.mood_score,
        entry_source=journal_data.entry_source.value,
        is_favorite=journal_data.is_favorite,
    )

    db.add(new_journal)
    db.commit()
    db.refresh(new_journal)

    return new_journal


@router.get(
    "",
    response_model=list[JournalResponse],
)
def list_journals(
    db: Session = Depends(get_db),
) -> list[JournalEntry]:
    statement = select(JournalEntry).order_by(
        JournalEntry.created_at.desc()
    )

    return list(db.scalars(statement).all())


@router.get(
    "/{entry_id}",
    response_model=JournalResponse,
)
def get_journal(
    entry_id: int,
    db: Session = Depends(get_db),
) -> JournalEntry:
    journal = db.get(JournalEntry, entry_id)

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
) -> JournalEntry:
    journal = db.get(JournalEntry, entry_id)

    if journal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        )

    update_data = journal_data.model_dump(exclude_unset=True)

    if "mood_label" in update_data and update_data["mood_label"] is not None:
        update_data["mood_label"] = update_data["mood_label"].value

    if (
        "entry_source" in update_data
        and update_data["entry_source"] is not None
    ):
        update_data["entry_source"] = update_data["entry_source"].value

    for field_name, value in update_data.items():
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
) -> Response:
    journal = db.get(JournalEntry, entry_id)

    if journal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found.",
        )

    db.delete(journal)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
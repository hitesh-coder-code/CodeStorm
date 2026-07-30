from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    JournalStatsResponse,
    MoodSummaryResponse,
    MoodTrendPoint,
)
from app.services.analytics_service import (
    calculate_journal_stats,
    calculate_mood_summary,
    calculate_mood_trend,
)


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


@router.get(
    "/mood-summary",
    response_model=MoodSummaryResponse,
    summary="Get mood category counts",
)
def get_mood_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MoodSummaryResponse:
    return calculate_mood_summary(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/mood-trend",
    response_model=list[MoodTrendPoint],
    summary="Get daily mood-score trend",
)
def get_mood_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MoodTrendPoint]:
    return calculate_mood_trend(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/journal-stats",
    response_model=JournalStatsResponse,
    summary="Get journal statistics",
)
def get_journal_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JournalStatsResponse:
    return calculate_journal_stats(
        db=db,
        user_id=current_user.id,
    )
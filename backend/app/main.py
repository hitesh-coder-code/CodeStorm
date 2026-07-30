from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine

# These imports register the SQLAlchemy models.
from app.models.journal_entry import JournalEntry  # noqa: F401
from app.models.user import User  # noqa: F401

from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.journal_entries import router as journal_router


# This creates tables during local development.
# Later, Alembic migrations will replace this line.
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend API for a privacy-focused AI journaling application."
    ),
    version="1.0.0",
    debug=settings.debug,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/",
    tags=["Root"],
    summary="Backend root",
)
def root() -> dict[str, str]:
    return {
        "message": "Privacy Journal API is running",
        "documentation": "/docs",
    }


@app.get(
    "/api/v1/health",
    tags=["Health"],
    summary="Check backend health",
)
def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "journal-backend",
    }


app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(analytics_router)
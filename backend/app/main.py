from fastapi import FastAPI

from app.core.database import Base, engine

# These imports register the database tables.
from app.models.journal_entry import JournalEntry  # noqa: F401
from app.models.user import User  # noqa: F401

from app.routers.auth import router as auth_router
from app.routers.journal_entries import router as journal_router


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Privacy Journal API",
    description="Backend API for a privacy-focused journal application.",
    version="1.0.0",
)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "message": "Privacy Journal API is running",
        "documentation": "/docs",
    }


@app.get("/api/v1/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "journal-backend",
    }


app.include_router(auth_router)
app.include_router(journal_router)
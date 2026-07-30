from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.ai import router as ai_router
from app.core.config import settings
from app.core.database import Base, engine
from app.models.journal_entry import JournalEntry  # noqa: F401
from app.models.user import User  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.journal_entries import router as journal_router
from app.routers.speech import router as speech_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Privacy Journal API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Privacy Journal API is running",
        "documentation": "/docs",
    }


@app.get("/api/v1/health")
def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "journal-backend",
    }


app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(speech_router)
app.include_router(ai_router)
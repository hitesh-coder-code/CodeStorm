from fastapi import FastAPI

app = FastAPI(
    title="Privacy Journal API",
    version="1.0.0"
)


@app.get("/api/v1/health")
def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "journal-backend"
    }
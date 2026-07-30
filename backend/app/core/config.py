from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Privacy Journal API"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./journal.db"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    backend_cors_origins: str = (
        "http://localhost:8080,"
        "http://127.0.0.1:8080"
    )

    redis_enabled: bool = False
    redis_url: str = "redis://localhost:6379/0"

    @property
    def cors_origins(self) -> list[str]:
        """
        Convert comma-separated origins from .env into a Python list.
        """
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
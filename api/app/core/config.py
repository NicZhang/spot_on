"""Application settings loaded from environment / .env file.

All fields have sensible defaults for local development. Override via
environment variables or a ``.env`` file in the project root.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "Spot On"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/spot_on"
    DB_ECHO: bool = False

    # JWT
    JWT_SECRET_KEY: str = "spot-on-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Redis
    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # WeChat Mini Program
    WX_APP_ID: str = ""
    WX_APP_SECRET: str = ""


settings = Settings()

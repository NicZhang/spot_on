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


settings = Settings()

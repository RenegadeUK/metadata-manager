from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]
CONFIG_DIR = Path("/config")


class Settings(BaseSettings):
    app_name: str = Field(default="Metadata Manager", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    app_log_level: str = Field(default="INFO", alias="APP_LOG_LEVEL")
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:8000",
        alias="CORS_ORIGINS",
    )
    config_dir: Path = Field(default=Path("/config"), alias="CONFIG_DIR")
    media_dir: Path = Field(default=Path("/media"), alias="MEDIA_DIR")
    postgres_db: str = Field(default="metadata_manager", alias="POSTGRES_DB")
    postgres_user: str = Field(default="metadata_manager", alias="POSTGRES_USER")
    postgres_password: str = Field(default="metadata_manager", alias="POSTGRES_PASSWORD")
    postgres_host: str = Field(default="127.0.0.1", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    database_url: str = Field(
        default="postgresql+psycopg://metadata_manager:metadata_manager@127.0.0.1:5432/metadata_manager",
        alias="DATABASE_URL",
    )

    model_config = SettingsConfigDict(
        env_file=(CONFIG_DIR / ".env", ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def normalized_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

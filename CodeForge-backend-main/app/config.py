from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str
    jwt_secret_key: str
    jwt_expiry_hours: int = Field(default=24, ge=24, le=24)
    judge0_api_url: AnyHttpUrl
    judge0_api_key: str | None = None
    google_oauth_client_id: str
    google_oauth_client_secret: str
    github_oauth_client_id: str
    github_oauth_client_secret: str
    frontend_origin: AnyHttpUrl


@lru_cache
def get_settings() -> Settings:
    return Settings()

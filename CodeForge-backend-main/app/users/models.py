from datetime import datetime, timezone

from beanie import Document
from pydantic import ConfigDict, EmailStr, Field
from pymongo import IndexModel


class User(Document):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    hashed_password: str | None = None
    oauth_provider: str | None = None
    oauth_id: str | None = None
    username: str = Field(min_length=1, max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = [IndexModel("email", unique=True)]


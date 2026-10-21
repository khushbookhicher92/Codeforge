from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import ConfigDict, Field

from app.problems.schemas import Language
from app.submissions.schemas import Verdict


class Submission(Document):
    model_config = ConfigDict(extra="forbid")

    user_id: PydanticObjectId
    problem_id: PydanticObjectId
    language: Language
    code: str
    verdict: Verdict
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "submissions"


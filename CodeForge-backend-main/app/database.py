from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings
from app.problems.models import Problem
from app.submissions.models import Submission
from app.users.models import User


async def initialize_database() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client.get_default_database(),
        document_models=[User, Problem, Submission],
    )

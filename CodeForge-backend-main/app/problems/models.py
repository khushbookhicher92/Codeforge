from pydantic import ConfigDict, Field
from beanie import Document

from app.problems.schemas import Difficulty, Language, ProblemExample, TestCase


class Problem(Document):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    description_markdown: str = Field(min_length=1)
    examples: list[ProblemExample]
    constraints: str = Field(min_length=1)
    difficulty: Difficulty
    tags: list[str]
    time_limit_ms: int = Field(gt=0)
    memory_limit_kb: int = Field(gt=0)
    function_signatures: dict[Language, str]
    driver_templates: dict[Language, str]
    test_cases: list[TestCase] = Field(min_length=1)

    class Settings:
        name = "problems"


from typing import Any, Literal

from pydantic import Field, StrictBool, StrictInt, StrictStr

from app.users.schemas import StrictSchema

Difficulty = Literal["Easy", "Medium", "Hard"]
Language = Literal["python", "java", "cpp"]
ProblemStatus = Literal["solved", "unsolved"]


class ProblemExampleResponse(StrictSchema):
    input: StrictStr
    output: StrictStr
    explanation: StrictStr


class ProblemListItemResponse(StrictSchema):
    id: StrictStr
    title: StrictStr
    difficulty: Difficulty
    tags: list[StrictStr]
    solved: StrictBool


class ProblemListResponse(StrictSchema):
    items: list[ProblemListItemResponse]
    total: StrictInt
    page: StrictInt
    limit: StrictInt


class ProblemDetailResponse(StrictSchema):
    id: StrictStr
    title: StrictStr
    description_markdown: StrictStr
    examples: list[ProblemExampleResponse]
    constraints: StrictStr
    difficulty: Difficulty
    tags: list[StrictStr]
    function_signatures: dict[Language, StrictStr]


class ProblemExample(StrictSchema):
    input: StrictStr
    output: StrictStr
    explanation: StrictStr


class TestCase(StrictSchema):
    input: dict[str, Any]
    expected_output: Any


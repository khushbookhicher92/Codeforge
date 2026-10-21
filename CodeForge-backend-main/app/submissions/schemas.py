from datetime import datetime
from typing import Literal

from pydantic import StrictInt, StrictStr

from app.problems.schemas import Language
from app.users.schemas import StrictSchema

Verdict = Literal["AC", "WA", "TLE", "MLE", "RE", "CE"]
RunStatus = Literal["success", "compile_error", "runtime_error", "time_limit_exceeded", "memory_limit_exceeded"]


class RunRequest(StrictSchema):
    language: Language
    code: StrictStr
    custom_input: StrictStr


class RunResponse(StrictSchema):
    stdout: StrictStr
    stderr: StrictStr
    compile_output: StrictStr
    status: RunStatus


class SubmitRequest(StrictSchema):
    language: Language
    code: StrictStr


class SubmitResponse(StrictSchema):
    submission_id: StrictStr
    verdict: Verdict
    submitted_at: datetime


class SubmissionListItemResponse(StrictSchema):
    id: StrictStr
    problem_id: StrictStr
    language: Language
    verdict: Verdict
    submitted_at: datetime


class SubmissionListResponse(StrictSchema):
    items: list[SubmissionListItemResponse]
    total: StrictInt
    page: StrictInt
    limit: StrictInt


class SubmissionDetailResponse(StrictSchema):
    id: StrictStr
    problem_id: StrictStr
    language: Language
    code: StrictStr
    verdict: Verdict
    submitted_at: datetime

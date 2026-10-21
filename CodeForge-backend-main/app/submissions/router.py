from typing import Annotated

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser
from app.submissions.schemas import (
    RunRequest,
    RunResponse,
    SubmissionDetailResponse,
    SubmissionListResponse,
    SubmitRequest,
    SubmitResponse,
)
from app.submissions.service import get_submission, list_submissions, run_code, submit_code

router = APIRouter(tags=["submissions"])


@router.post("/api/problems/{problem_id}/run", response_model=RunResponse)
async def run_problem(problem_id: str, payload: RunRequest, current_user: CurrentUser) -> RunResponse:
    return await run_code(problem_id, payload)


@router.post("/api/problems/{problem_id}/submit", response_model=SubmitResponse)
async def submit_problem(problem_id: str, payload: SubmitRequest, current_user: CurrentUser) -> SubmitResponse:
    return await submit_code(current_user, problem_id, payload)


@router.get("/api/submissions", response_model=SubmissionListResponse)
async def read_submissions(
    current_user: CurrentUser,
    problem_id: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> SubmissionListResponse:
    return await list_submissions(current_user, problem_id, page, limit)


@router.get("/api/submissions/{submission_id}", response_model=SubmissionDetailResponse)
async def read_submission(submission_id: str, current_user: CurrentUser) -> SubmissionDetailResponse:
    return await get_submission(current_user, submission_id)

from typing import Annotated

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser
from app.problems.schemas import Difficulty, ProblemDetailResponse, ProblemListResponse, ProblemStatus
from app.problems.service import get_problem_or_404, list_problems, to_problem_detail

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("", response_model=ProblemListResponse)
async def read_problems(
    current_user: CurrentUser,
    difficulty: Difficulty | None = None,
    tags: str | None = None,
    status: ProblemStatus | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ProblemListResponse:
    parsed_tags = tuple(tag.strip() for tag in tags.split(",") if tag.strip()) if tags else ()
    return await list_problems(current_user, difficulty, parsed_tags, status, page, limit)


@router.get("/{problem_id}", response_model=ProblemDetailResponse)
async def read_problem(problem_id: str, current_user: CurrentUser) -> ProblemDetailResponse:
    problem = await get_problem_or_404(problem_id)
    return to_problem_detail(problem)

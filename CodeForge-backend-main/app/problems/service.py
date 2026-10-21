from collections.abc import Sequence

from beanie import PydanticObjectId
from fastapi import HTTPException

from app.problems.models import Problem
from app.problems.schemas import (
    Difficulty,
    ProblemDetailResponse,
    ProblemListItemResponse,
    ProblemListResponse,
    ProblemStatus,
)
from app.submissions.models import Submission
from app.users.models import User


def parse_problem_id(problem_id: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(problem_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="Problem not found") from exc


async def get_problem_or_404(problem_id: str) -> Problem:
    object_id = parse_problem_id(problem_id)
    try:
        problem = await Problem.get(object_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to retrieve problem") from exc
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


def to_problem_detail(problem: Problem) -> ProblemDetailResponse:
    return ProblemDetailResponse(
        id=str(problem.id),
        title=problem.title,
        description_markdown=problem.description_markdown,
        examples=[example.model_dump() for example in problem.examples],
        constraints=problem.constraints,
        difficulty=problem.difficulty,
        tags=problem.tags,
        function_signatures=problem.function_signatures,
    )


async def list_problems(
    user: User,
    difficulty: Difficulty | None,
    tags: Sequence[str],
    status: ProblemStatus | None,
    page: int,
    limit: int,
) -> ProblemListResponse:
    try:
        accepted_submissions = await Submission.find(
            Submission.user_id == user.id, Submission.verdict == "AC"
        ).to_list()
        solved_problem_ids = {submission.problem_id for submission in accepted_submissions}
        query: dict[str, object] = {}
        if difficulty is not None:
            query["difficulty"] = difficulty
        if tags:
            query["tags"] = {"$all": list(tags)}
        if status == "solved":
            query["_id"] = {"$in": list(solved_problem_ids)}
        elif status == "unsolved":
            query["_id"] = {"$nin": list(solved_problem_ids)}

        problem_query = Problem.find(query)
        total = await problem_query.count()
        problems = await problem_query.skip((page - 1) * limit).limit(limit).to_list()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to retrieve problems") from exc

    return ProblemListResponse(
        items=[
            ProblemListItemResponse(
                id=str(problem.id),
                title=problem.title,
                difficulty=problem.difficulty,
                tags=problem.tags,
                solved=problem.id in solved_problem_ids,
            )
            for problem in problems
        ],
        total=total,
        page=page,
        limit=limit,
    )

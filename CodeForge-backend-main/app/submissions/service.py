import json

from beanie import PydanticObjectId
from fastapi import HTTPException

from app.problems.models import Problem
from app.problems.service import get_problem_or_404, parse_problem_id
from app.submissions.judge0_client import Judge0Result, Judge0ServiceUnavailable, execute_batch
from app.submissions.models import Submission
from app.submissions.schemas import (
    RunRequest,
    RunResponse,
    SubmissionDetailResponse,
    SubmissionListItemResponse,
    SubmissionListResponse,
    SubmitRequest,
    SubmitResponse,
    Verdict,
)
from app.users.models import User


def combine_source(problem: Problem, language: str, code: str) -> str:
    template = problem.driver_templates.get(language)
    if template is None or "{{USER_CODE}}" not in template:
        raise HTTPException(status_code=500, detail="Problem driver template is invalid")
    return template.replace("{{USER_CODE}}", code)


def serialize_expected_output(value: object) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def map_verdict(results: list[Judge0Result]) -> Verdict:
    descriptions = [result.status_description.lower() for result in results]
    status_ids = [result.status_id for result in results]
    if any(status_id == 6 or "compilation error" in description for status_id, description in zip(status_ids, descriptions)):
        return "CE"
    if any(status_id == 5 or "time limit" in description for status_id, description in zip(status_ids, descriptions)):
        return "TLE"
    if any("memory limit" in description for description in descriptions):
        return "MLE"
    if any(
        status_id not in {3, 4, 5, 6} or "runtime error" in description
        for status_id, description in zip(status_ids, descriptions)
    ):
        return "RE"
    if any(status_id == 4 or "wrong answer" in description for status_id, description in zip(status_ids, descriptions)):
        return "WA"
    return "AC"


def map_run_status(result: Judge0Result) -> str:
    description = result.status_description.lower()
    if result.status_id == 6 or "compilation error" in description:
        return "compile_error"
    if result.status_id == 5 or "time limit" in description:
        return "time_limit_exceeded"
    if "memory limit" in description:
        return "memory_limit_exceeded"
    if result.status_id != 3:
        return "runtime_error"
    return "success"


def judge0_unavailable_http_exception() -> HTTPException:
    return HTTPException(status_code=503, detail="Judge0 service unavailable, try again later")


async def run_code(problem_id: str, payload: RunRequest) -> RunResponse:
    problem = await get_problem_or_404(problem_id)
    source_code = combine_source(problem, payload.language, payload.code)
    try:
        results = await execute_batch(
            source_code=source_code,
            language=payload.language,
            stdins=[payload.custom_input],
            time_limit_ms=problem.time_limit_ms,
            memory_limit_kb=problem.memory_limit_kb,
        )
    except Judge0ServiceUnavailable as exc:
        raise judge0_unavailable_http_exception() from exc

    result = results[0]
    return RunResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        compile_output=result.compile_output,
        status=map_run_status(result),
    )


async def submit_code(user: User, problem_id: str, payload: SubmitRequest) -> SubmitResponse:
    problem = await get_problem_or_404(problem_id)
    source_code = combine_source(problem, payload.language, payload.code)
    stdins = [json.dumps(test_case.input, separators=(",", ":"), ensure_ascii=False) for test_case in problem.test_cases]
    expected_outputs = [serialize_expected_output(test_case.expected_output) for test_case in problem.test_cases]

    try:
        results = await execute_batch(
            source_code=source_code,
            language=payload.language,
            stdins=stdins,
            expected_outputs=expected_outputs,
            time_limit_ms=problem.time_limit_ms,
            memory_limit_kb=problem.memory_limit_kb,
        )
    except Judge0ServiceUnavailable as exc:
        raise judge0_unavailable_http_exception() from exc

    submission = Submission(
        user_id=user.id,
        problem_id=problem.id,
        language=payload.language,
        code=payload.code,
        verdict=map_verdict(results),
    )
    try:
        await submission.insert()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to save submission") from exc

    return SubmitResponse(
        submission_id=str(submission.id),
        verdict=submission.verdict,
        submitted_at=submission.submitted_at,
    )


async def list_submissions(
    user: User, problem_id: str | None, page: int, limit: int
) -> SubmissionListResponse:
    query: dict[str, object] = {"user_id": user.id}
    if problem_id is not None:
        query["problem_id"] = parse_problem_id(problem_id)
    try:
        submissions_query = Submission.find(query).sort("-submitted_at")
        total = await submissions_query.count()
        submissions = await submissions_query.skip((page - 1) * limit).limit(limit).to_list()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to retrieve submissions") from exc

    return SubmissionListResponse(
        items=[
            SubmissionListItemResponse(
                id=str(submission.id),
                problem_id=str(submission.problem_id),
                language=submission.language,
                verdict=submission.verdict,
                submitted_at=submission.submitted_at,
            )
            for submission in submissions
        ],
        total=total,
        page=page,
        limit=limit,
    )


async def get_submission(user: User, submission_id: str) -> SubmissionDetailResponse:
    try:
        object_id = PydanticObjectId(submission_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="Submission not found") from exc
    try:
        submission = await Submission.find_one(Submission.id == object_id, Submission.user_id == user.id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to retrieve submission") from exc
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return SubmissionDetailResponse(
        id=str(submission.id),
        problem_id=str(submission.problem_id),
        language=submission.language,
        code=submission.code,
        verdict=submission.verdict,
        submitted_at=submission.submitted_at,
    )

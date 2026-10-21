import asyncio
import json
from dataclasses import dataclass
from time import monotonic
from typing import Any

import httpx

from app.config import get_settings
from app.problems.schemas import Language

POLL_INTERVAL_SECONDS = 2
POLL_TIMEOUT_SECONDS = 30
LANGUAGE_IDS: dict[Language, int] = {"python": 71, "java": 62, "cpp": 54}
QUEUED_STATUS_IDS = {1, 2}


class Judge0ServiceUnavailable(Exception):
    pass


@dataclass(frozen=True)
class Judge0Result:
    status_id: int
    status_description: str
    stdout: str
    stderr: str
    compile_output: str


def _headers() -> dict[str, str]:
    settings = get_settings()
    return {"X-Auth-Token": settings.judge0_api_key} if settings.judge0_api_key else {}


def _api_url(path: str) -> str:
    return f"{str(get_settings().judge0_api_url).rstrip('/')}{path}"


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _parse_result(payload: object) -> Judge0Result:
    if not isinstance(payload, dict):
        raise Judge0ServiceUnavailable()
    status = payload.get("status")
    if not isinstance(status, dict) or not isinstance(status.get("id"), int):
        raise Judge0ServiceUnavailable()
    return Judge0Result(
        status_id=status["id"],
        status_description=_as_string(status.get("description")),
        stdout=_as_string(payload.get("stdout")),
        stderr=_as_string(payload.get("stderr")),
        compile_output=_as_string(payload.get("compile_output")),
    )


async def execute_batch(
    source_code: str,
    language: Language,
    stdins: list[str],
    time_limit_ms: int,
    memory_limit_kb: int,
    expected_outputs: list[str] | None = None,
) -> list[Judge0Result]:
    if expected_outputs is not None and len(expected_outputs) != len(stdins):
        raise ValueError("Judge0 batch inputs do not match expected outputs")

    submissions: list[dict[str, object]] = []
    for index, stdin in enumerate(stdins):
        submission: dict[str, object] = {
            "source_code": source_code,
            "language_id": LANGUAGE_IDS[language],
            "stdin": stdin,
            "cpu_time_limit": time_limit_ms / 1000,
            "memory_limit": memory_limit_kb,
        }
        if expected_outputs is not None:
            submission["expected_output"] = expected_outputs[index]
        submissions.append(submission)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                _api_url("/submissions/batch"),
                params={"base64_encoded": "false", "wait": "false"},
                json={"submissions": submissions},
                headers=_headers(),
            )
            response.raise_for_status()
            batch_response = response.json()
            if not isinstance(batch_response, list):
                raise Judge0ServiceUnavailable()
            tokens = [item.get("token") for item in batch_response if isinstance(item, dict)]
            if len(tokens) != len(stdins) or not all(isinstance(token, str) and token for token in tokens):
                raise Judge0ServiceUnavailable()

            return await _poll_batch(client, tokens)
    except (httpx.HTTPError, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise Judge0ServiceUnavailable() from exc


async def _poll_batch(client: httpx.AsyncClient, tokens: list[str]) -> list[Judge0Result]:
    deadline = monotonic() + POLL_TIMEOUT_SECONDS
    while monotonic() < deadline:
        try:
            response = await client.get(
                _api_url("/submissions/batch"),
                params={
                    "tokens": ",".join(tokens),
                    "base64_encoded": "false",
                    "fields": "stdout,stderr,compile_output,status",
                },
                headers=_headers(),
            )
            response.raise_for_status()
            payload = response.json()
            submissions = payload.get("submissions") if isinstance(payload, dict) else None
            if not isinstance(submissions, list) or len(submissions) != len(tokens):
                raise Judge0ServiceUnavailable()
            results = [_parse_result(item) for item in submissions]
        except (httpx.HTTPError, ValueError, TypeError, json.JSONDecodeError) as exc:
            raise Judge0ServiceUnavailable() from exc

        if all(result.status_id not in QUEUED_STATUS_IDS for result in results):
            return results
        await asyncio.sleep(POLL_INTERVAL_SECONDS)

    raise Judge0ServiceUnavailable()


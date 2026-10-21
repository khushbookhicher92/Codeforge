from fastapi import HTTPException

from app.submissions.models import Submission
from app.users.models import User
from app.users.schemas import ProfileResponse


def to_current_user_response(user: User) -> dict[str, str]:
    return {"id": str(user.id), "email": str(user.email), "username": user.username}


async def get_profile(user: User) -> ProfileResponse:
    try:
        accepted_submissions = await Submission.find(
            Submission.user_id == user.id, Submission.verdict == "AC"
        ).to_list()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to retrieve profile") from exc

    return ProfileResponse(
        username=user.username,
        email=user.email,
        solved_count=len({submission.problem_id for submission in accepted_submissions}),
    )

from fastapi import APIRouter

from app.core.dependencies import CurrentUser
from app.users.schemas import ProfileResponse
from app.users.service import get_profile

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/profile", response_model=ProfileResponse)
async def read_my_profile(current_user: CurrentUser) -> ProfileResponse:
    return await get_profile(current_user)


from typing import Annotated

from fastapi import APIRouter, Query, Request, status
from fastapi.responses import RedirectResponse

from app.auth.schemas import LoginRequest, LoginResponse, RegisterRequest, RegisterResponse
from app.auth.service import (
    build_github_login_redirect,
    build_google_login_redirect,
    complete_github_oauth,
    complete_google_oauth,
    login_user,
    register_user,
)
from app.core.dependencies import CurrentUser
from app.users.schemas import CurrentUserResponse
from app.users.service import to_current_user_response

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> RegisterResponse:
    return await register_user(payload)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    return await login_user(str(payload.email), payload.password)


@router.get("/oauth/google/login")
async def google_oauth_login(request: Request) -> RedirectResponse:
    return build_google_login_redirect(request)


@router.get("/oauth/google/callback", name="google_oauth_callback")
async def google_oauth_callback(
    request: Request, code: Annotated[str, Query(min_length=1)]
) -> RedirectResponse:
    return await complete_google_oauth(request, code)


@router.get("/oauth/github/login")
async def github_oauth_login(request: Request) -> RedirectResponse:
    return build_github_login_redirect(request)


@router.get("/oauth/github/callback", name="github_oauth_callback")
async def github_oauth_callback(
    request: Request, code: Annotated[str, Query(min_length=1)]
) -> RedirectResponse:
    return await complete_github_oauth(request, code)


@router.get("/me", response_model=CurrentUserResponse)
async def read_current_user(current_user: CurrentUser) -> CurrentUserResponse:
    return CurrentUserResponse(**to_current_user_response(current_user))

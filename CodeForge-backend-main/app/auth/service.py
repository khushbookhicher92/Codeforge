from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse

from app.auth.schemas import LoginResponse, RegisterRequest, RegisterResponse
from app.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.users.models import User
from app.users.service import to_current_user_response

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


async def register_user(payload: RegisterRequest) -> RegisterResponse:
    try:
        existing_user = await User.find_one(User.email == payload.email)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to register user") from exc
    if existing_user is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        username=payload.username,
    )
    try:
        await user.insert()
    except Exception as exc:
        if "duplicate key" in str(exc).lower():
            raise HTTPException(status_code=400, detail="Email already registered") from exc
        raise HTTPException(status_code=500, detail="Unable to register user") from exc

    return RegisterResponse(**to_current_user_response(user), created_at=user.created_at)


async def login_user(email: str, password: str) -> LoginResponse:
    try:
        user = await User.find_one(User.email == email)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to log in") from exc

    if user is None or user.hashed_password is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return LoginResponse(
        access_token=create_access_token(str(user.id)),
        token_type="bearer",
        user=to_current_user_response(user),
    )


def build_google_login_redirect(request: Request) -> RedirectResponse:
    settings = get_settings()
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": str(request.url_for("google_oauth_callback")),
        "response_type": "code",
        "scope": "email profile",
    }
    return RedirectResponse(f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}", status_code=302)


def build_github_login_redirect(request: Request) -> RedirectResponse:
    settings = get_settings()
    params = {
        "client_id": settings.github_oauth_client_id,
        "redirect_uri": str(request.url_for("github_oauth_callback")),
        "scope": "user:email",
    }
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}", status_code=302)


async def complete_google_oauth(request: Request, code: str) -> RedirectResponse:
    settings = get_settings()
    redirect_uri = str(request.url_for("google_oauth_callback"))
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_oauth_client_id,
                    "client_secret": settings.google_oauth_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            user_response = await client.get(
                GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
            user_response.raise_for_status()
            profile = user_response.json()
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Google OAuth service unavailable") from exc

    provider_id = profile.get("sub")
    email = profile.get("email")
    username = profile.get("name") or profile.get("given_name") or email
    return await complete_oauth_user("google", provider_id, email, username)


async def complete_github_oauth(request: Request, code: str) -> RedirectResponse:
    settings = get_settings()
    redirect_uri = str(request.url_for("github_oauth_callback"))
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                GITHUB_TOKEN_URL,
                headers={"Accept": "application/json"},
                data={
                    "code": code,
                    "client_id": settings.github_oauth_client_id,
                    "client_secret": settings.github_oauth_client_secret,
                    "redirect_uri": redirect_uri,
                },
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            user_response = await client.get(
                GITHUB_USER_URL,
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            )
            user_response.raise_for_status()
            profile = user_response.json()
            email = profile.get("email")
            if not email:
                emails_response = await client.get(
                    GITHUB_EMAILS_URL,
                    headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
                )
                emails_response.raise_for_status()
                emails = emails_response.json()
                primary_email = next((item for item in emails if item.get("primary") and item.get("verified")), None)
                email = (primary_email or next((item for item in emails if item.get("verified")), {})).get("email")
    except (httpx.HTTPError, ValueError, TypeError, StopIteration) as exc:
        raise HTTPException(status_code=502, detail="GitHub OAuth service unavailable") from exc

    provider_id = profile.get("id")
    username = profile.get("login") or profile.get("name") or email
    return await complete_oauth_user("github", provider_id, email, username)


async def complete_oauth_user(
    provider: str, provider_id: object, email: object, username: object
) -> RedirectResponse:
    if not isinstance(provider_id, (str, int)) or not isinstance(email, str) or not isinstance(username, str):
        raise HTTPException(status_code=400, detail="OAuth provider did not return required profile data")

    try:
        user = await User.find_one(User.email == email)
        if user is None:
            user = User(
                email=email,
                oauth_provider=provider,
                oauth_id=str(provider_id),
                username=username,
            )
            await user.insert()
    except Exception as exc:
        if "duplicate key" in str(exc).lower():
            try:
                user = await User.find_one(User.email == email)
            except Exception as database_exc:
                raise HTTPException(status_code=500, detail="Unable to complete OAuth login") from database_exc
        else:
            raise HTTPException(status_code=500, detail="Unable to complete OAuth login") from exc

    if user is None:
        raise HTTPException(status_code=500, detail="Unable to complete OAuth login")
    return build_oauth_success_redirect(create_access_token(str(user.id)))


def build_oauth_success_redirect(access_token: str) -> RedirectResponse:
    settings = get_settings()
    return RedirectResponse(
        f"{str(settings.frontend_origin).rstrip('/')}" + f"/oauth-success?{urlencode({'token': access_token})}",
        status_code=302,
    )

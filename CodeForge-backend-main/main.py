from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.config import get_settings
from app.database import initialize_database
from app.problems.router import router as problems_router
from app.submissions.router import router as submissions_router
from app.users.router import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    await initialize_database()
    yield


settings = get_settings()
app = FastAPI(title="CodeForge API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(settings.frontend_origin).rstrip("/")],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(problems_router)
app.include_router(submissions_router)

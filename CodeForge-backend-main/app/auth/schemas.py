from datetime import datetime

from pydantic import EmailStr, Field, StrictStr, field_validator

from app.users.schemas import CurrentUserResponse, StrictSchema


class PasswordRequest(StrictSchema):
    password: StrictStr = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_bcrypt_password_length(cls, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes")
        return password


class RegisterRequest(PasswordRequest):
    email: EmailStr
    username: StrictStr = Field(min_length=1, max_length=100)


class RegisterResponse(CurrentUserResponse):
    created_at: datetime


class LoginRequest(PasswordRequest):
    email: EmailStr


class LoginResponse(StrictSchema):
    access_token: StrictStr
    token_type: StrictStr
    user: CurrentUserResponse

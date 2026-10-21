from pydantic import BaseModel, ConfigDict, EmailStr, StrictInt, StrictStr


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class CurrentUserResponse(StrictSchema):
    id: StrictStr
    email: EmailStr
    username: StrictStr


class ProfileResponse(StrictSchema):
    username: StrictStr
    email: EmailStr
    solved_count: StrictInt


from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: str
    picture: Optional[str] = None
    is_verified: bool = True

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    picture: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str

class ProfilePictureUpdateRequest(BaseModel):
    picture: Optional[str] = None

class VerifyEmailRequest(BaseModel):
    token: str

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool = False
    picture: Optional[str] = None
    created_at: datetime
    message: Optional[str] = None

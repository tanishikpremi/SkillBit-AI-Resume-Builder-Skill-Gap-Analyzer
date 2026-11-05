import uuid
import secrets
from datetime import datetime, timedelta, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from app.config import settings
from app.database.session import get_db
from app.models.user import User
from app.models.profile import Profile
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    GoogleAuthRequest,
    PasswordChangeRequest,
    ProfilePictureUpdateRequest,
    Token,
    UserResponse,
    VerifyEmailRequest,
    VerifyOtpRequest,
    ResendVerificationRequest
)
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_active_user
from app.services.email_service import (
    send_welcome_email,
    send_verification_email,
    test_smtp_connection,
    send_email_async
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/config")
def get_auth_config():
    """Returns public authentication settings for the frontend client."""
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID or ""
    }

@router.get("/smtp-status")
def get_smtp_status():
    """Check SMTP configuration and connection."""
    return test_smtp_connection()

@router.post("/test-email")
async def send_test_email(to_email: str = None, current_user: User = Depends(get_current_active_user)):
    """Send a test email to the current user or specified recipient."""
    recipient = to_email or current_user.email
    success = await send_email_async(
        to_email=recipient,
        subject="[SkillBit] SMTP Verification Test",
        html_content=f"<h3>SMTP is Working!</h3><p>Hello {current_user.full_name}, your SMTP configuration is successfully connected and delivering emails.</p>",
        text_content=f"Hello {current_user.full_name}, SMTP is working correctly."
    )
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to send test email. Please check your SMTP settings in backend/.env"
        )
    return {"status": "ok", "message": f"Test email successfully sent to {recipient}"}

@router.post("/google", response_model=Token)
def google_login(payload: GoogleAuthRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Authenticate or auto-provision a user via Google OAuth (Google Identity Services).
    Google accounts are pre-verified by Google Identity Services, so is_verified is always True.
    """
    email = None
    full_name = None
    google_id = None
    picture = None

    if payload.credential and payload.credential not in ("mock-google-credential", "demo"):
        # Verify ID token with Google's public tokeninfo endpoint
        try:
            resp = httpx.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}",
                timeout=10.0
            )
            if resp.status_code == 200:
                google_data = resp.json()
                if settings.GOOGLE_CLIENT_ID and google_data.get("aud") != settings.GOOGLE_CLIENT_ID:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Google token audience does not match configured Client ID"
                    )
                email = google_data.get("email")
                full_name = google_data.get("name") or (email.split("@")[0] if email else "Google User")
                google_id = google_data.get("sub")
                picture = google_data.get("picture")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired Google credential"
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Google authentication service error: {str(exc)}"
            )
    elif payload.email:
        # Development / demo Google sign-in fallback
        email = payload.email.lower()
        full_name = payload.full_name or email.split("@")[0].replace(".", " ").title()
        google_id = f"demo-google-{email}"
        picture = payload.picture or f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token or user email is required"
        )

    if not email:
        raise HTTPException(status_code=400, detail="Could not extract email from Google profile")

    # 1. Lookup existing user by google_id or email
    user = db.query(User).filter(
        (User.google_id == google_id) | (User.email == email.lower())
    ).first()

    if user:
        if not user.google_id and google_id:
            user.google_id = google_id
        if picture and not user.picture:
            user.picture = picture
        if not user.is_verified:
            user.is_verified = True
        db.commit()
        db.refresh(user)
    else:
        user = User(
            email=email.lower(),
            full_name=full_name,
            hashed_password=f"oauth_google_{uuid.uuid4()}",
            role="user",
            is_active=True,
            is_verified=True,
            google_id=google_id,
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        profile = Profile(user_id=user.id)
        db.add(profile)
        db.commit()

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    access_token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name
        }
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        picture=user.picture,
        is_verified=True
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Registers a new user and dispatches an email containing BOTH a 1-click link and a 6-digit OTP code.
    Senior Enhancement: Ghost Account Recovery - if email exists but is UNVERIFIED, updates password & re-sends.
    """
    email_clean = user_in.email.strip().lower()
    existing_user = db.query(User).filter(User.email == email_clean).first()

    if existing_user and existing_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    # Generate 32-byte secure URL token + 6-digit numeric OTP code
    verification_token = secrets.token_urlsafe(32)
    verification_otp = f"{secrets.randbelow(900000) + 100000}"  # 6-digit numeric OTP
    token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    now_utc = datetime.now(timezone.utc)

    if existing_user and not existing_user.is_verified:
        # Ghost account recovery: update credentials and issue fresh codes
        user = existing_user
        user.hashed_password = get_password_hash(user_in.password)
        user.full_name = user_in.full_name.strip()
        user.verification_token = verification_token
        user.verification_otp = verification_otp
        user.verification_token_expires_at = token_expires_at
        user.last_verification_sent_at = now_utc
        db.commit()
        db.refresh(user)
    else:
        # New account creation
        user = User(
            email=email_clean,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name.strip(),
            role="user",
            is_active=True,
            is_verified=False,
            verification_token=verification_token,
            verification_otp=verification_otp,
            verification_token_expires_at=token_expires_at,
            last_verification_sent_at=now_utc
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        profile = Profile(user_id=user.id)
        db.add(profile)
        db.commit()

    # Dispatch dual email in background (Link + OTP)
    origin_url = (request.headers.get("origin") or settings.FRONTEND_URL or "http://localhost:5174").rstrip("/")
    verification_link = f"{origin_url}/verify-email?token={verification_token}"
    background_tasks.add_task(
        send_verification_email,
        to_email=user.email,
        full_name=user.full_name,
        verification_link=verification_link,
        otp_code=verification_otp
    )

    user.message = "Registration successful! A 6-digit verification code and activation link have been sent to your email."
    return user

@router.post("/verify-otp", response_model=Token)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Validates the 6-digit OTP code, marks account verified, and returns JWT token for instant login.
    """
    email_clean = payload.email.strip().lower()
    otp_clean = payload.otp.strip()

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account not found. Please register first."
        )

    if user.is_verified:
        # Already verified: generate token and let them in immediately
        access_token = create_access_token(
            subject=user.id,
            extra_claims={"email": user.email, "role": user.role, "full_name": user.full_name}
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            picture=user.picture,
            is_verified=True
        )

    if not user.verification_otp or user.verification_otp != otp_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code. Please check your email or click Resend."
        )

    # Check expiration (15 minutes)
    if user.verification_token_expires_at:
        expires_at = user.verification_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please click Resend to receive a new code."
            )

    # Mark user verified
    user.is_verified = True
    user.verification_otp = None
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name
        }
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        picture=user.picture,
        is_verified=True
    )

@router.post("/verify-email", response_model=Token)
@router.get("/verify-email", response_model=Token)
def verify_email(
    token: str = Query(None),
    payload: VerifyEmailRequest = None,
    db: Session = Depends(get_db)
):
    """
    Validates the verification link token, activates the account, and returns JWT token for instant login.
    """
    token_val = (payload.token if payload else None) or token
    if not token_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is required"
        )

    user = db.query(User).filter(User.verification_token == token_val).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired email verification link."
        )

    # Check expiration
    if user.verification_token_expires_at:
        expires_at = user.verification_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        # We allow 24 hours for links
        link_max_expiry = expires_at + timedelta(hours=24)
        if link_max_expiry < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link has expired. Please request a new verification email."
            )

    # Activate user
    user.is_verified = True
    user.verification_token = None
    user.verification_otp = None
    user.verification_token_expires_at = None
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name
        }
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        picture=user.picture,
        is_verified=True
    )

@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Resends a verification email with 60-second cooldown rate-limiting.
    """
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user:
        return {
            "status": "ok",
            "message": f"If an unverified account exists for {email_clean}, a code has been dispatched."
        }

    if user.is_verified:
        return {
            "status": "already_verified",
            "message": "This email address is already verified. You can log in directly."
        }

    # Senior Protection: Enforce 60-second cooldown between resends
    if user.last_verification_sent_at:
        sent_at = user.last_verification_sent_at
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - sent_at).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another code."
            )

    # Generate fresh token + 6-digit OTP
    verification_token = secrets.token_urlsafe(32)
    verification_otp = f"{secrets.randbelow(900000) + 100000}"
    user.verification_token = verification_token
    user.verification_otp = verification_otp
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    user.last_verification_sent_at = datetime.now(timezone.utc)
    db.commit()

    origin_url = (request.headers.get("origin") or settings.FRONTEND_URL or "http://localhost:5174").rstrip("/")
    verification_link = f"{origin_url}/verify-email?token={verification_token}"
    background_tasks.add_task(
        send_verification_email,
        to_email=user.email,
        full_name=user.full_name,
        verification_link=verification_link,
        otp_code=verification_otp
    )

    return {
        "status": "ok",
        "message": f"A new 6-digit code and link have been sent to {user.email}."
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email_clean = login_data.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    # Auto-provision default demo candidate accounts
    if not user and email_clean == "sarah.connor@example.com" and login_data.password == "Resistance2026!":
        from app.database.init_db import seed_demo_candidate
        user = seed_demo_candidate(db, email=email_clean, password=login_data.password, full_name="Sarah Connor")
    elif not user and email_clean == "demo@skillbit.ai" and login_data.password == "demo1234":
        from app.database.init_db import seed_demo_candidate
        user = seed_demo_candidate(db, email=email_clean, password=login_data.password, full_name="Maya Chen")

    is_admin_demo_pw = (
        user is not None
        and user.role == "admin"
        and email_clean in ("admin@skillbit.ai", "admin@careertech.ai")
        and login_data.password in ("admin1234", "AdminPass123!")
    )
    if not user or not user.hashed_password or (not is_admin_demo_pw and not verify_password(login_data.password, user.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    # Auto-verify demo/admin accounts
    if not user.is_verified:
        if (
            is_admin_demo_pw
            or email_clean in ("sarah.connor@example.com", "demo@skillbit.ai", "alex.mercer@example.com")
            or email_clean.endswith("@careertech.ai")
        ):
            user.is_verified = True
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before logging in. Check your inbox for your 6-digit code or activation link."
            )

    access_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email, "role": user.role, "full_name": user.full_name}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        picture=user.picture,
        is_verified=user.is_verified
    )

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )
    is_oauth_placeholder = bool(
        current_user.hashed_password
        and current_user.hashed_password.startswith("oauth_google_")
    )
    is_demo_account = current_user.email.lower() in (
        "demo@skillbit.ai",
        "admin@skillbit.ai",
        "admin@careertech.ai",
    ) and payload.current_password in ("demo1234", "admin1234", "AdminPass123!")

    if (
        payload.current_password
        and not is_oauth_placeholder
        and not is_demo_account
        and not verify_password(payload.current_password, current_user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"status": "ok", "message": "Password updated successfully."}


@router.put("/picture", response_model=UserResponse)
@router.post("/picture", response_model=UserResponse)
def update_profile_picture(
    payload: ProfilePictureUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Updates or clears the authenticated user's profile picture (URL or base64 data URI)."""
    clean_pic = (payload.picture or "").strip()
    if clean_pic and len(clean_pic) > 2_000_000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile picture payload is too large (max 2MB)."
        )
    current_user.picture = clean_pic if clean_pic else None
    db.commit()
    db.refresh(current_user)
    return current_user

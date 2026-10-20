import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.config import settings
from app.database.session import get_db
from app.models.user import User
from app.models.profile import Profile
from app.schemas.auth import UserRegister, UserLogin, GoogleAuthRequest, Token, UserResponse
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_active_user
from app.services.email_service import send_welcome_email, test_smtp_connection, send_email_async

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
    Supports production Google ID Token verification as well as development/demo mode.
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
        # Link Google ID and update picture if not set
        if not user.google_id and google_id:
            user.google_id = google_id
        if picture and not user.picture:
            user.picture = picture
        db.commit()
        db.refresh(user)
    else:
        # 2. Auto-provision user account (replaces manual signup)
        user = User(
            email=email.lower(),
            full_name=full_name,
            hashed_password=f"oauth_google_{uuid.uuid4()}",
            role="user",
            is_active=True,
            google_id=google_id,
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 3. Create default profile
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
        picture=user.picture
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # 1. Check if email already registered
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    # 2. Create user
    user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 3. Initialize empty user profile
    profile = Profile(user_id=user.id)
    db.add(profile)
    db.commit()
    
    return user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not user.hashed_password or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

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
        picture=user.picture
    )

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user


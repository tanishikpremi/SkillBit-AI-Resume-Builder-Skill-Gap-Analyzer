import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=[str(BASE_DIR / ".env"), ".env"], extra="ignore")

    APP_NAME: str = "SkillBit - AI Resume Builder & Skill Gap Analyzer"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "academic_prototype_super_secret_jwt_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Frontend URL for email verification and callback links
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # Database: Defaults to SQLite for immediate local zero-config usage, supports PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/app.db")
    
    # Document storage
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:8443",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8443",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4173",
    ]
    
    # LLM Settings (Free-tier providers: Groq, Gemini, Grok, OpenAI with automatic fallback)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "auto")
    USE_MOCK_LLM_IF_NO_KEY: bool = True

    # Google OAuth Settings
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # SMTP / Email Notification Settings (Gmail default)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "SkillBit")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

    # Job Discovery & Multi-Source Search Settings
    JSEARCH_API_KEY: str = os.getenv("JSEARCH_API_KEY", "")
    SERPAPI_API_KEY: str = os.getenv("SERPAPI_API_KEY", "")
    BRAVE_SEARCH_API_KEY: str = os.getenv("BRAVE_SEARCH_API_KEY", "")
    ADZUNA_APP_ID: str = os.getenv("ADZUNA_APP_ID", "")
    ADZUNA_APP_KEY: str = os.getenv("ADZUNA_APP_KEY", "")
    FINDWORK_API_KEY: str = os.getenv("FINDWORK_API_KEY", "")
    X_BEARER_TOKEN: str = os.getenv("X_BEARER_TOKEN", "")
    JOB_SEARCH_TIMEOUT_SECONDS: float = float(os.getenv("JOB_SEARCH_TIMEOUT_SECONDS", "6.0"))
    JOB_SEARCH_RATE_LIMIT_RPM: int = int(os.getenv("JOB_SEARCH_RATE_LIMIT_RPM", "30"))
    ENABLE_LIVE_JOB_DISCOVERY: bool = os.getenv("ENABLE_LIVE_JOB_DISCOVERY", "true").lower() in ("true", "1", "yes")

settings = Settings()

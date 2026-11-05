import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="user")  # 'user', 'admin', 'mentor'
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), unique=True, index=True, nullable=True)
    verification_otp = Column(String(10), index=True, nullable=True)
    verification_token_expires_at = Column(DateTime, nullable=True)
    last_verification_sent_at = Column(DateTime, nullable=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    picture = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    job_descriptions = relationship("JobDescription", back_populates="user", cascade="all, delete-orphan")
    analyses = relationship("AnalysisHistory", back_populates="user", cascade="all, delete-orphan")
    profile_snapshot = relationship("CandidateProfileSnapshot", back_populates="user", uselist=False, cascade="all, delete-orphan")
    job_preferences = relationship("UserJobPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    job_search_runs = relationship("JobSearchRun", back_populates="user", cascade="all, delete-orphan")
    job_recommendations = relationship("JobRecommendation", back_populates="user", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")

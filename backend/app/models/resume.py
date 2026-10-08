import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="My Resume")
    source_type = Column(String(50), default="builder")  # 'builder', 'uploaded'
    file_path = Column(String(500), nullable=True)  # Private storage path if uploaded
    raw_text = Column(Text, nullable=True)
    structured_json = Column(JSON, default=dict)  # Complete structured resume: contact, summary, education, experience, projects, skills, etc.
    ats_score = Column(Float, nullable=True)  # General ATS readability / quality score
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="resumes")
    analyses = relationship("AnalysisHistory", back_populates="resume", cascade="all, delete-orphan")

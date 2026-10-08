import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=False)
    seniority_level = Column(String(50), nullable=True)  # Entry, Mid, Senior, Lead
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="job_descriptions")
    job_skills = relationship("JobSkill", back_populates="job_description", cascade="all, delete-orphan")
    analyses = relationship("AnalysisHistory", back_populates="job_description", cascade="all, delete-orphan")

class JobSkill(Base):
    __tablename__ = "job_skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(String(36), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    importance = Column(String(50), default="REQUIRED")  # 'REQUIRED' or 'PREFERRED'
    weight = Column(Float, default=1.0)
    context_snippet = Column(Text, nullable=True)

    # Relationships
    job_description = relationship("JobDescription", back_populates="job_skills")
    skill = relationship("Skill", back_populates="job_skills")

    __table_args__ = (
        Index("ix_job_skill_lookup", "job_id", "skill_id"),
    )

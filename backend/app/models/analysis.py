import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    
    # Explainable match scores
    overall_score = Column(Float, nullable=False)       # 0.0 - 100.0
    exact_match_score = Column(Float, default=0.0)      # 0.0 - 100.0
    semantic_score = Column(Float, default=0.0)         # 0.0 - 100.0
    experience_score = Column(Float, default=0.0)       # 0.0 - 100.0
    
    summary_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="analyses")
    resume = relationship("Resume", back_populates="analyses")
    job_description = relationship("JobDescription", back_populates="analyses")
    gaps = relationship("SkillGap", back_populates="analysis", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="analysis", cascade="all, delete-orphan")

class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("analysis_history.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(String(36), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    
    # Gap status: 'STRONG_MATCH', 'PARTIAL_MATCH', 'WEAK_EVIDENCE', 'MISSING'
    gap_status = Column(String(50), nullable=False)
    # Priority: 'HIGH', 'MEDIUM', 'LOW'
    priority = Column(String(50), default="MEDIUM")
    
    resume_evidence = Column(Text, nullable=True)  # Matched bullet point or context snippet
    job_requirement_snippet = Column(Text, nullable=True)  # How the job phrased it
    reason = Column(Text, nullable=False)  # Explainable justification for why this is considered a gap or match

    # Relationships
    analysis = relationship("AnalysisHistory", back_populates="gaps")
    skill = relationship("Skill", back_populates="skill_gaps")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("analysis_history.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(String(36), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    
    learning_topic = Column(String(255), nullable=False)
    concepts = Column(JSON, default=list)  # List of core sub-concepts to master
    practice_project = Column(Text, nullable=True)  # Concrete project idea to prove this skill
    certification_name = Column(String(255), nullable=True)  # Recommended certification if applicable
    suggested_resume_bullet = Column(Text, nullable=True)  # STAR-grounded bullet recommendation
    resource_url = Column(String(500), nullable=True)

    # Relationships
    analysis = relationship("AnalysisHistory", back_populates="recommendations")
    skill = relationship("Skill", back_populates="recommendations")

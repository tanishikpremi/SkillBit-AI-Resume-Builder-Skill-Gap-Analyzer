import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canonical_name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    # Categories: Programming Languages, Frameworks, Libraries, Databases, Cloud, DevOps, Tools, Data/Analytics, AI/ML, Cybersecurity, Domain Skills, Soft Skills
    description = Column(Text, nullable=True)

    # Relationships
    aliases = relationship("SkillAlias", back_populates="skill", cascade="all, delete-orphan")
    user_skills = relationship("UserSkill", back_populates="skill")
    job_skills = relationship("JobSkill", back_populates="skill")
    skill_gaps = relationship("SkillGap", back_populates="skill")
    recommendations = relationship("Recommendation", back_populates="skill")

class SkillAlias(Base):
    __tablename__ = "skill_aliases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_id = Column(String(36), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    alias_name = Column(String(100), index=True, nullable=False)

    # Relationships
    skill = relationship("Skill", back_populates="aliases")

    __table_args__ = (
        Index("ix_skill_alias_lower", "alias_name"),
    )

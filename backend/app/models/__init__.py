from app.database.session import Base
from app.models.user import User
from app.models.profile import Profile, Education, Experience, Project, UserSkill
from app.models.skill import Skill, SkillAlias
from app.models.resume import Resume
from app.models.job import JobDescription, JobSkill
from app.models.analysis import AnalysisHistory, SkillGap, Recommendation
from app.models.discovery import (
    JobSource,
    JobListing,
    JobSourceEvidence,
    CandidateProfileSnapshot,
    UserJobPreferences,
    JobSearchRun,
    JobRecommendation,
    SavedJob,
    JobApplication,
)

__all__ = [
    "Base",
    "User",
    "Profile",
    "Education",
    "Experience",
    "Project",
    "UserSkill",
    "Skill",
    "SkillAlias",
    "Resume",
    "JobDescription",
    "JobSkill",
    "AnalysisHistory",
    "SkillGap",
    "Recommendation",
    "JobSource",
    "JobListing",
    "JobSourceEvidence",
    "CandidateProfileSnapshot",
    "UserJobPreferences",
    "JobSearchRun",
    "JobRecommendation",
    "SavedJob",
    "JobApplication",
]

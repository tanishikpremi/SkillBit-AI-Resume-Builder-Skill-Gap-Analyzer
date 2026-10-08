from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class EducationBase(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    honors: Optional[str] = None

class EducationCreate(EducationBase):
    pass

class EducationResponse(EducationBase):
    model_config = ConfigDict(from_attributes=True)
    id: str

class ExperienceBase(BaseModel):
    company: str
    role_title: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    bullets: List[str] = []
    technologies: List[str] = []

class ExperienceCreate(ExperienceBase):
    pass

class ExperienceResponse(ExperienceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    role: Optional[str] = None
    technologies: List[str] = []
    repo_url: Optional[str] = None
    live_url: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: str

class UserSkillBase(BaseModel):
    skill_id: str
    proficiency: str = "Intermediate"
    years_experience: Optional[float] = None
    verified_by_resume: bool = False

class UserSkillCreate(UserSkillBase):
    pass

class UserSkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    skill_id: str
    skill_name: Optional[str] = None
    category: Optional[str] = None
    proficiency: str
    years_experience: Optional[float] = None
    verified_by_resume: bool = False

class ProfileBase(BaseModel):
    headline: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    educations: List[EducationResponse] = []
    experiences: List[ExperienceResponse] = []
    projects: List[ProjectResponse] = []
    user_skills: List[UserSkillResponse] = []

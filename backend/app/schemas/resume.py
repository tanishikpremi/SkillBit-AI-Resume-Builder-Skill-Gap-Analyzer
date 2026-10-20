from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ResumeBase(BaseModel):
    title: str = "My Professional Resume"

class ResumeCreate(ResumeBase):
    structured_json: Dict[str, Any] = {}

class ResumeSkillInfo(BaseModel):
    skill_id: str
    canonical_name: str
    category: str
    evidence_level: str  # 'STRONG', 'MODERATE', 'LISTED', 'MENTIONED'
    evidence_snippets: List[str] = []
    sections_found: List[str] = []
    mention_count: int = 1

class ResumeResponse(ResumeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    source_type: str
    file_path: Optional[str] = None
    structured_json: Dict[str, Any] = {}
    ats_score: Optional[float] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class ResumeUploadResponse(ResumeResponse):
    extracted_skills: List[ResumeSkillInfo] = []
    detected_sections: Dict[str, Any] = {}
    generated_profile: Dict[str, Any] = {}
    is_exact_profile_match: bool = False
    existing_resume_id: Optional[str] = None
    existing_profile_title: Optional[str] = None
    profile_match_message: Optional[str] = None

class RepoAnalysisRequest(BaseModel):
    repo_url: str
    project_title: Optional[str] = None

class RepoAnalysisResponse(BaseModel):
    title: str
    repo_url: str
    description: Optional[str] = ""
    technologies: List[str] = []
    bullets: List[str] = []
    stars: Optional[int] = None
    language: Optional[str] = None


from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class JobSkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    skill_id: str
    skill_name: Optional[str] = None
    category: Optional[str] = None
    importance: str  # 'REQUIRED' or 'PREFERRED'
    weight: float
    context_snippet: Optional[str] = None

class JobDescriptionCreate(BaseModel):
    title: str
    company: Optional[str] = None
    raw_text: str

class JobExtractUrlRequest(BaseModel):
    url: str

class JobExtractedDetailsResponse(BaseModel):
    title: str
    company: Optional[str] = None
    raw_text: str
    seniority_level: Optional[str] = None
    source_type: str = "file"
    source_label: Optional[str] = None
    skills_detected_count: int = 0

class JobDescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    company: Optional[str] = None
    seniority_level: Optional[str] = None
    raw_text: str
    created_at: datetime
    job_skills: List[JobSkillResponse] = []

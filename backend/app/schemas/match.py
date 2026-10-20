from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class MatchAnalyzeRequest(BaseModel):
    resume_id: str
    job_id: str

class SkillGapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    skill_id: str
    skill_name: str
    category: str
    importance: str  # 'REQUIRED' or 'PREFERRED'
    gap_status: str  # 'STRONG_MATCH', 'PARTIAL_MATCH', 'WEAK_EVIDENCE', 'MISSING'
    priority: str    # 'HIGH', 'MEDIUM', 'LOW'
    resume_evidence: Optional[str] = None
    job_requirement_snippet: Optional[str] = None
    reason: str

class MatchAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    resume_id: str
    job_id: str
    job_title: str
    company: Optional[str] = None
    overall_score: float
    exact_match_score: float
    semantic_score: float
    experience_score: float
    matched_count: int
    total_job_skills: int
    summary_notes: Optional[str] = None
    ai_insights: Optional[Dict[str, Any]] = None
    disclaimer: str
    created_at: datetime
    gaps: List[SkillGapResponse] = []

class AnalysisHistorySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_id: str
    job_id: str
    job_title: str
    overall_score: float
    created_at: datetime

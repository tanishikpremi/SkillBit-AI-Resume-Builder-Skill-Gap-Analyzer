from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class QualityIndicator(BaseModel):
    label: str
    status: str  # 'EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT'
    score: int   # 0 - 100
    message: str

class DashboardSummaryResponse(BaseModel):
    user_name: str
    resume_count: int
    active_resume_id: Optional[str] = None
    active_resume_title: Optional[str] = None
    resume_completeness_pct: int
    overall_quality_score: int
    quality_indicators: List[QualityIndicator] = []
    recent_analyses: List[Dict[str, Any]] = []
    top_strengths: List[str] = []
    top_critical_gaps: List[Dict[str, Any]] = []
    skill_category_distribution: Dict[str, int] = {}
    recommendations_count: int = 0

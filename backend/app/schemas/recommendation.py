from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    skill_id: str
    skill_name: str
    gap_status: str
    priority: str
    learning_topic: str
    concepts: List[str] = []
    practice_project: Optional[str] = None
    certification_name: Optional[str] = None
    suggested_resume_bullet: Optional[str] = None
    action_plan: Optional[str] = None
    resource_url: Optional[str] = None

class BulletSuggestionRequest(BaseModel):
    raw_bullet: str
    target_skill: Optional[str] = None
    role_context: Optional[str] = None

class BulletSuggestionResponse(BaseModel):
    original_bullet: str
    suggested_bullet: str
    methodology: str
    changes_explained: str
    is_editable: bool = True
    review_prompt: str

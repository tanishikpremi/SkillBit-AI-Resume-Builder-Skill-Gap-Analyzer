from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class SkillAliasBase(BaseModel):
    alias_name: str

class SkillAliasResponse(SkillAliasBase):
    model_config = ConfigDict(from_attributes=True)
    id: str

class SkillBase(BaseModel):
    canonical_name: str
    category: str
    description: Optional[str] = None

class SkillCreate(SkillBase):
    aliases: List[str] = []

class SkillResponse(SkillBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    aliases: List[SkillAliasResponse] = []


class SkillNormalizedMatch(BaseModel):
    original_text: str
    canonical_name: str
    category: str
    match_type: str  # 'EXACT', 'ALIAS', 'FUZZY_SEMANTIC'
    confidence: float

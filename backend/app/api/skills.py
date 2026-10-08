from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.models.skill import Skill, SkillAlias
from app.schemas.skill import SkillResponse, SkillNormalizedMatch

router = APIRouter(prefix="/skills", tags=["Skills & Taxonomy"])

@router.get("", response_model=List[SkillResponse])
def get_skills(
    query: Optional[str] = Query(None, description="Search term for skill name or alias"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    q = db.query(Skill)
    if category:
        q = q.filter(Skill.category == category)
    if query:
        search_pattern = f"%{query.lower()}%"
        # Join with aliases to search both canonical name and aliases
        q = q.join(Skill.aliases).filter(
            or_(
                Skill.canonical_name.ilike(search_pattern),
                SkillAlias.alias_name.ilike(search_pattern)
            )
        ).distinct()
    return q.limit(limit).all()

@router.get("/categories")
def get_skill_categories(db: Session = Depends(get_db)):
    categories = db.query(Skill.category).distinct().all()
    result = {}
    for (cat,) in categories:
        skills = db.query(Skill).filter(Skill.category == cat).all()
        result[cat] = [
            {"id": s.id, "name": s.canonical_name, "description": s.description}
            for s in skills
        ]
    return result

@router.post("/normalize", response_model=List[SkillNormalizedMatch])
def normalize_skills(
    skill_names: List[str],
    db: Session = Depends(get_db)
):
    results = []
    for raw_name in skill_names:
        clean = raw_name.strip().lower()
        if not clean:
            continue
        
        # 1. Exact canonical match
        canonical_match = db.query(Skill).filter(Skill.canonical_name.ilike(clean)).first()
        if canonical_match:
            results.append(SkillNormalizedMatch(
                original_text=raw_name,
                canonical_name=canonical_match.canonical_name,
                category=canonical_match.category,
                match_type="EXACT",
                confidence=1.0
            ))
            continue
            
        # 2. Alias match
        alias_match = db.query(SkillAlias).filter(SkillAlias.alias_name == clean).first()
        if alias_match and alias_match.skill:
            results.append(SkillNormalizedMatch(
                original_text=raw_name,
                canonical_name=alias_match.skill.canonical_name,
                category=alias_match.skill.category,
                match_type="ALIAS",
                confidence=0.95
            ))
            continue
            
        # 3. Substring match
        substr_alias = db.query(SkillAlias).filter(SkillAlias.alias_name.ilike(f"%{clean}%")).first()
        if substr_alias and substr_alias.skill:
            results.append(SkillNormalizedMatch(
                original_text=raw_name,
                canonical_name=substr_alias.skill.canonical_name,
                category=substr_alias.skill.category,
                match_type="FUZZY_SEMANTIC",
                confidence=0.80
            ))
            continue

    return results

from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from app.models.skill import Skill, SkillAlias

def normalize_single_skill(raw_name: str, db: Session) -> Optional[Skill]:
    """
    Normalizes a single skill string to its canonical Skill model object.
    Resolution priority:
    1. Exact canonical name match (case-insensitive)
    2. Exact alias match (case-insensitive)
    3. Trimmed / stripped alias match
    """
    if not raw_name or not raw_name.strip():
        return None
        
    cleaned = raw_name.strip().lower()

    # 1. Exact canonical name
    canonical = db.query(Skill).filter(Skill.canonical_name.ilike(cleaned)).first()
    if canonical:
        return canonical

    # 2. Exact alias
    alias = db.query(SkillAlias).filter(SkillAlias.alias_name == cleaned).first()
    if alias and alias.skill:
        return alias.skill

    # 3. Clean common noise words: 'programming', 'developer', 'framework', 'database'
    simplified = cleaned.replace(" programming", "").replace(" framework", "").replace(" database", "").strip()
    if simplified != cleaned:
        alias = db.query(SkillAlias).filter(SkillAlias.alias_name == simplified).first()
        if alias and alias.skill:
            return alias.skill

    return None

def normalize_skill_list(raw_skills: List[str], db: Session) -> List[Dict[str, str]]:
    """
    Normalizes a list of arbitrary skill strings into deduplicated canonical skill records.
    """
    seen_ids = set()
    normalized = []
    
    for raw in raw_skills:
        skill = normalize_single_skill(raw, db)
        if skill and skill.id not in seen_ids:
            seen_ids.add(skill.id)
            normalized.append({
                "skill_id": skill.id,
                "canonical_name": skill.canonical_name,
                "category": skill.category,
                "original_input": raw
            })
            
    return normalized

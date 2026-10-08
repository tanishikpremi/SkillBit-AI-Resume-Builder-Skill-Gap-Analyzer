from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.analysis import AnalysisHistory, SkillGap
from app.models.skill import Skill, SkillAlias
from app.schemas.skill import SkillCreate, SkillResponse
from app.api.deps import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["Admin & Placement Team Insights"])

@router.get("/metrics")
def get_admin_cohort_metrics(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Placement Team & Mentor Analytics:
    Aggregates batch candidate statistics, average ATS match scores,
    and the top skill gaps across the entire student/candidate cohort.
    """
    total_users = db.query(User).count()
    total_resumes = db.query(Resume).count()
    total_analyses = db.query(AnalysisHistory).count()
    
    # Average Match Score
    avg_score = db.query(func.avg(AnalysisHistory.overall_score)).scalar() or 0.0
    
    # Top Missing Skills across the entire platform
    top_missing_query = db.query(
        Skill.canonical_name,
        Skill.category,
        func.count(SkillGap.id).label("gap_count")
    ).join(SkillGap, Skill.id == SkillGap.skill_id)\
     .filter(SkillGap.gap_status == "MISSING")\
     .group_by(Skill.canonical_name, Skill.category)\
     .order_by(func.count(SkillGap.id).desc())\
     .limit(10).all()

    top_missing_skills = [
        {"skill_name": row[0], "category": row[1], "frequency": row[2]}
        for row in top_missing_query
    ]

    # Category distribution of total canonical skills
    category_counts = db.query(
        Skill.category,
        func.count(Skill.id)
    ).group_by(Skill.category).all()

    return {
        "cohort_overview": {
            "total_candidates": total_users,
            "total_resumes_generated": total_resumes,
            "total_evaluations_run": total_analyses,
            "cohort_average_match_score": round(float(avg_score), 1)
        },
        "placement_insights": {
            "top_cohort_skill_gaps": top_missing_skills,
            "curriculum_recommendation": "Consider organizing targeted bootcamps for the top missing skills identified across candidate analyses."
        },
        "taxonomy_stats": {
            row[0]: row[1] for row in category_counts
        }
    }

@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def admin_create_skill(
    skill_in: SkillCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Skill).filter(Skill.canonical_name.ilike(skill_in.canonical_name.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill with this canonical name already exists.")

    skill = Skill(
        canonical_name=skill_in.canonical_name.strip(),
        category=skill_in.category.strip(),
        description=skill_in.description
    )
    db.add(skill)
    db.flush()

    # Add self alias
    db.add(SkillAlias(skill_id=skill.id, alias_name=skill.canonical_name.lower()))

    # Add extra aliases
    for alias in skill_in.aliases:
        clean = alias.strip().lower()
        if clean and clean != skill.canonical_name.lower():
            db.add(SkillAlias(skill_id=skill.id, alias_name=clean))

    db.commit()
    db.refresh(skill)
    return skill

@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_skill(
    skill_id: str,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")
    db.delete(skill)
    db.commit()

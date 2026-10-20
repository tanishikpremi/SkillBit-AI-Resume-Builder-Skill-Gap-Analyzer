from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.analysis import AnalysisHistory, SkillGap, Recommendation
from app.models.skill import Skill
from app.schemas.recommendation import (
    RecommendationResponse,
    BulletSuggestionRequest,
    BulletSuggestionResponse,
    CustomRoadmapRequest,
    CustomRoadmapResponse
)
from app.api.deps import get_current_active_user
from app.ai.recommendation_engine import generate_recommendation_for_gap
from app.ai.resume_content_generator import generate_star_bullet_suggestions
from app.ai.llm_service import llm_service

router = APIRouter(tags=["Recommendations & Resume Improvement"])

@router.get("/recommendations/{analysis_id}", response_model=List[RecommendationResponse])
def get_recommendations_for_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(AnalysisHistory).filter(
        AnalysisHistory.id == analysis_id,
        AnalysisHistory.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found")

    # Check if recommendations were already generated and persisted for this analysis
    existing_recs = db.query(Recommendation).filter(Recommendation.analysis_id == analysis.id).all()
    if existing_recs:
        results = []
        for r in existing_recs:
            skill = db.query(Skill).filter(Skill.id == r.skill_id).first()
            gap = db.query(SkillGap).filter(
                SkillGap.analysis_id == analysis.id,
                SkillGap.skill_id == r.skill_id
            ).first()

            learning_path = r.learning_path
            if not learning_path and skill:
                learning_path = llm_service.generate_sequential_roadmap(skill.canonical_name)
                r.learning_path = learning_path
                db.commit()

            results.append(RecommendationResponse(
                id=r.id,
                skill_id=r.skill_id,
                skill_name=skill.canonical_name if skill else "Skill",
                gap_status=gap.gap_status if gap else "GAP",
                priority=gap.priority if gap else "MEDIUM",
                learning_topic=r.learning_topic,
                concepts=r.concepts or [],
                learning_path=learning_path or [],
                practice_project=r.practice_project,
                certification_name=r.certification_name,
                suggested_resume_bullet=r.suggested_resume_bullet,
                action_plan=f"Targeted roadmap to master {skill.canonical_name if skill else 'this skill'}.",
                resource_url=r.resource_url
            ))
        return results

    # Generate recommendations for every detected gap that is not STRONG_MATCH
    results = []
    for gap in analysis.gaps:
        if gap.gap_status == "STRONG_MATCH":
            continue  # No recommendation needed for strong matches!
            
        skill = db.query(Skill).filter(Skill.id == gap.skill_id).first()
        skill_name = skill.canonical_name if skill else "Technology"

        rec_data = generate_recommendation_for_gap(
            skill_name=skill_name,
            gap_status=gap.gap_status,
            importance=gap.priority,
            evidence_snippet=gap.resume_evidence or ""
        )

        rec_obj = Recommendation(
            analysis_id=analysis.id,
            skill_id=gap.skill_id,
            learning_topic=rec_data["learning_topic"],
            concepts=rec_data["concepts"],
            learning_path=rec_data.get("learning_path", []),
            practice_project=rec_data["practice_project"],
            certification_name=rec_data["certification_name"],
            suggested_resume_bullet=rec_data["suggested_resume_bullet"],
            resource_url=rec_data["resource_url"]
        )
        db.add(rec_obj)
        db.flush()

        results.append(RecommendationResponse(
            id=rec_obj.id,
            skill_id=gap.skill_id,
            skill_name=skill_name,
            gap_status=gap.gap_status,
            priority=gap.priority,
            learning_topic=rec_data["learning_topic"],
            concepts=rec_data["concepts"],
            learning_path=rec_data.get("learning_path", []),
            practice_project=rec_data["practice_project"],
            certification_name=rec_data["certification_name"],
            suggested_resume_bullet=rec_data["suggested_resume_bullet"],
            action_plan=rec_data["action_plan"],
            resource_url=rec_data["resource_url"]
        ))

    db.commit()
    return results

@router.post("/recommendations/generate-roadmap", response_model=CustomRoadmapResponse)
def generate_custom_ai_roadmap(
    req: CustomRoadmapRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Generates an on-demand, role-tailored sequential learning roadmap using the active LLM."""
    stages = llm_service.generate_sequential_roadmap(
        skill_name=req.skill_name,
        target_role=req.target_role or "Software Engineer",
        candidate_level=req.candidate_level or "Intermediate"
    )
    provider_info = llm_service.get_provider_info()

    return CustomRoadmapResponse(
        skill_name=req.skill_name,
        target_role=req.target_role or "Software Engineer",
        total_stages=len(stages),
        estimated_total_time="3-4 weeks",
        provider=provider_info["name"],
        learning_path=stages
    )

@router.post("/resume/suggest-bullets", response_model=BulletSuggestionResponse)
def suggest_bullet_improvement(
    payload: BulletSuggestionRequest,
    current_user: User = Depends(get_current_active_user)
):
    suggestion = generate_star_bullet_suggestions(
        raw_bullet=payload.raw_bullet or "",
        target_skill=payload.target_skill,
        context=payload.role_context
    )

    return BulletSuggestionResponse(**suggestion)


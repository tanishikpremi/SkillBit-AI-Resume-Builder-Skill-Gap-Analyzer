from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database.session import get_db
from app.models.user import User
from app.models.profile import Profile
from app.models.resume import Resume
from app.models.analysis import AnalysisHistory, SkillGap, Recommendation
from app.models.skill import Skill
from app.schemas.dashboard import DashboardSummaryResponse, QualityIndicator
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])

@router.get("", response_model=DashboardSummaryResponse)
def get_dashboard_metrics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    resumes = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_active == True
    ).order_by(desc(Resume.created_at)).all()

    active_resume = resumes[0] if resumes else None

    # Calculate Profile / Resume Completeness Percentage
    completeness = 0
    if profile:
        if profile.headline: completeness += 10
        if profile.summary: completeness += 15
        if profile.phone: completeness += 5
        if profile.location: completeness += 5
        if profile.educations: completeness += 15
        if profile.experiences: completeness += 20
        if profile.projects: completeness += 15
        if profile.user_skills: completeness += 15
    completeness = min(completeness, 100)

    # Calculate Quality Indicators based on active resume or profile
    quality_indicators = []
    
    # 1. Action Verbs & Metrics
    exp_bullets = []
    if active_resume and active_resume.structured_json:
        for exp in active_resume.structured_json.get("experiences", []):
            exp_bullets.extend(exp.get("bullets", []))
    elif profile:
        for exp in profile.experiences:
            exp_bullets.extend(exp.bullets or [])

    quantified_count = sum(1 for b in exp_bullets if any(char.isdigit() for char in b))
    action_score = int((quantified_count / len(exp_bullets) * 100)) if exp_bullets else 40
    quality_indicators.append(QualityIndicator(
        label="Quantified Achievements",
        status="EXCELLENT" if action_score >= 60 else ("GOOD" if action_score >= 30 else "NEEDS_IMPROVEMENT"),
        score=action_score,
        message=f"{quantified_count} of {len(exp_bullets)} bullets feature measurable numbers or percentages."
    ))

    # 2. ATS Formatting & Structure
    ats_score = int(active_resume.ats_score) if (active_resume and active_resume.ats_score) else 75
    quality_indicators.append(QualityIndicator(
        label="ATS Structure & Headings",
        status="EXCELLENT" if ats_score >= 80 else ("GOOD" if ats_score >= 60 else "NEEDS_IMPROVEMENT"),
        score=ats_score,
        message="Single-column, clean semantic layout optimized for ATS parsers."
    ))

    # 3. Overall Quality Composite
    overall_quality = int((completeness * 0.4) + (action_score * 0.3) + (ats_score * 0.3))

    # Recent Analyses
    analyses = db.query(AnalysisHistory).filter(
        AnalysisHistory.user_id == current_user.id
    ).order_by(desc(AnalysisHistory.created_at)).limit(5).all()

    recent_analyses_data = []
    for a in analyses:
        recent_analyses_data.append({
            "id": a.id,
            "job_title": a.job_description.title if a.job_description else "Target Job",
            "company": a.job_description.company if a.job_description else "",
            "overall_score": a.overall_score,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M")
        })

    # Critical Gaps across latest analysis
    critical_gaps = []
    recommendation_count = 0
    if analyses:
        latest = analyses[0]
        high_gaps = db.query(SkillGap).filter(
            SkillGap.analysis_id == latest.id,
            SkillGap.priority == "HIGH"
        ).limit(6).all()
        
        for g in high_gaps:
            skill = db.query(Skill).filter(Skill.id == g.skill_id).first()
            critical_gaps.append({
                "skill_name": skill.canonical_name if skill else "Skill",
                "category": skill.category if skill else "General",
                "gap_status": g.gap_status,
                "reason": g.reason
            })
            
        recommendation_count = db.query(Recommendation).filter(
            Recommendation.analysis_id == latest.id
        ).count()

    # Skill Category Distribution from candidate's profile/active resume
    category_dist: Dict[str, int] = {}
    candidate_skills = []
    if active_resume and active_resume.structured_json:
        candidate_skills = active_resume.structured_json.get("extracted_skills", [])
    elif profile:
        for us in profile.user_skills:
            if us.skill:
                candidate_skills.append({"canonical_name": us.skill.canonical_name, "category": us.skill.category})

    top_strengths = []
    for s in candidate_skills:
        cat = s.get("category", "Other")
        category_dist[cat] = category_dist.get(cat, 0) + 1
        if len(top_strengths) < 6:
            top_strengths.append(s.get("canonical_name", ""))

    return DashboardSummaryResponse(
        user_name=current_user.full_name,
        resume_count=len(resumes),
        active_resume_id=active_resume.id if active_resume else None,
        active_resume_title=active_resume.title if active_resume else None,
        resume_completeness_pct=completeness,
        overall_quality_score=overall_quality,
        quality_indicators=quality_indicators,
        recent_analyses=recent_analyses_data,
        top_strengths=top_strengths,
        top_critical_gaps=critical_gaps,
        skill_category_distribution=category_dist,
        recommendations_count=recommendation_count
    )

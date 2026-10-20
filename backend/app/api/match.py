from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.job import JobDescription, JobSkill
from app.models.skill import Skill
from app.models.analysis import AnalysisHistory, SkillGap
from app.schemas.match import MatchAnalyzeRequest, MatchAnalysisResponse, SkillGapResponse, AnalysisHistorySummary
from app.api.deps import get_current_active_user
from app.ai.matching_engine import calculate_match_metrics
from app.ai.gap_analyzer import analyze_skill_gaps
from app.ai.llm_service import llm_service

router = APIRouter(prefix="/match", tags=["Match & Skill Gap Analysis"])

@router.get("/llm-provider")
def get_active_llm_provider():
    """Returns active LLM provider and model for transparent UI indication."""
    return llm_service.get_provider_info()

@router.post("/analyze", response_model=MatchAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_resume_job_match(
    req: MatchAnalyzeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Fetch Resume
    resume = db.query(Resume).filter(
        Resume.id == req.resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 2. Fetch Job Description
    job = db.query(JobDescription).filter(
        JobDescription.id == req.job_id,
        JobDescription.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")

    # 3. Prepare candidate skill profile & bullets
    structured = resume.structured_json or {}
    candidate_skills = structured.get("extracted_skills", [])
    
    # Candidate bullet points for semantic search
    raw_text = resume.raw_text or ""
    candidate_bullets = [
        line.strip() for line in raw_text.split("\n") 
        if len(line.strip()) > 15
    ]

    # 4. Prepare job skills list
    job_skills_data = []
    for js in job.job_skills:
        skill = db.query(Skill).filter(Skill.id == js.skill_id).first()
        job_skills_data.append({
            "skill_id": js.skill_id,
            "canonical_name": skill.canonical_name if skill else "Unknown",
            "category": skill.category if skill else "General",
            "importance": js.importance,
            "weight": js.weight,
            "context_snippet": js.context_snippet or js.importance
        })

    # 5. Run Matching Engine
    metrics = calculate_match_metrics(
        candidate_skills=candidate_skills,
        job_skills=job_skills_data,
        candidate_bullets=candidate_bullets
    )

    # 6. Run Skill Gap Analyzer
    gaps_data = analyze_skill_gaps(
        candidate_skills=candidate_skills,
        job_skills=job_skills_data
    )

    # 6b. Generate Strategic Gap Insights via LLM (Groq/Gemini/Grok/Fallback)
    ai_insights = llm_service.generate_gap_insights(
        candidate_name=current_user.full_name or "Candidate",
        job_title=job.title,
        company=job.company or "",
        overall_score=metrics["overall_score"],
        matched_count=metrics["matched_count"],
        total_skills=len(job_skills_data),
        gaps_list=gaps_data
    )

    # 7. Persist Analysis Record
    analysis = AnalysisHistory(
        user_id=current_user.id,
        resume_id=resume.id,
        job_id=job.id,
        overall_score=metrics["overall_score"],
        exact_match_score=metrics["exact_match_score"],
        semantic_score=metrics["semantic_score"],
        experience_score=metrics["experience_score"],
        summary_notes=f"Evaluated against {len(job_skills_data)} skills with {metrics['matched_count']} matched.",
        ai_insights=ai_insights
    )
    db.add(analysis)
    db.flush()

    # 8. Persist Gaps
    gap_responses = []
    for g in gaps_data:
        gap_obj = SkillGap(
            analysis_id=analysis.id,
            skill_id=g["skill_id"],
            gap_status=g["gap_status"],
            priority=g["priority"],
            resume_evidence=g.get("resume_evidence"),
            job_requirement_snippet=g.get("job_requirement_snippet"),
            reason=g["reason"]
        )
        db.add(gap_obj)
        db.flush()
        
        gap_responses.append(SkillGapResponse(
            id=gap_obj.id,
            skill_id=g["skill_id"],
            skill_name=g["canonical_name"],
            category=g["category"],
            importance=g["importance"],
            gap_status=g["gap_status"],
            priority=g["priority"],
            resume_evidence=g.get("resume_evidence"),
            job_requirement_snippet=g.get("job_requirement_snippet"),
            reason=g["reason"]
        ))

    db.commit()
    db.refresh(analysis)

    return MatchAnalysisResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        resume_id=resume.id,
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        overall_score=analysis.overall_score,
        exact_match_score=analysis.exact_match_score,
        semantic_score=analysis.semantic_score,
        experience_score=analysis.experience_score,
        matched_count=metrics["matched_count"],
        total_job_skills=metrics["total_job_skills"],
        summary_notes=analysis.summary_notes,
        ai_insights=analysis.ai_insights,
        disclaimer=metrics["disclaimer"],
        created_at=analysis.created_at,
        gaps=gap_responses
    )

@router.get("/history", response_model=List[AnalysisHistorySummary])
def get_match_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    analyses = db.query(AnalysisHistory).filter(
        AnalysisHistory.user_id == current_user.id
    ).order_by(AnalysisHistory.created_at.desc()).all()

    return [
        AnalysisHistorySummary(
            id=a.id,
            resume_id=a.resume_id,
            job_id=a.job_id,
            job_title=a.job_description.title if a.job_description else "Target Job",
            overall_score=a.overall_score,
            created_at=a.created_at
        )
        for a in analyses
    ]

@router.get("/{analysis_id}", response_model=MatchAnalysisResponse)
def get_analysis_by_id(
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

    gap_responses = []
    for g in analysis.gaps:
        skill = db.query(Skill).filter(Skill.id == g.skill_id).first()
        job_skill = db.query(JobSkill).filter(
            JobSkill.job_id == analysis.job_id,
            JobSkill.skill_id == g.skill_id
        ).first()
        
        gap_responses.append(SkillGapResponse(
            id=g.id,
            skill_id=g.skill_id,
            skill_name=skill.canonical_name if skill else "Unknown",
            category=skill.category if skill else "General",
            importance=job_skill.importance if job_skill else "REQUIRED",
            gap_status=g.gap_status,
            priority=g.priority,
            resume_evidence=g.resume_evidence,
            job_requirement_snippet=g.job_requirement_snippet,
            reason=g.reason
        ))

    return MatchAnalysisResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        resume_id=analysis.resume_id,
        job_id=analysis.job_id,
        job_title=analysis.job_description.title if analysis.job_description else "Job",
        company=analysis.job_description.company if analysis.job_description else None,
        overall_score=analysis.overall_score,
        exact_match_score=analysis.exact_match_score,
        semantic_score=analysis.semantic_score,
        experience_score=analysis.experience_score,
        matched_count=len([g for g in gap_responses if g.gap_status == "STRONG_MATCH"]),
        total_job_skills=len(gap_responses),
        summary_notes=analysis.summary_notes,
        ai_insights=analysis.ai_insights or llm_service.generate_gap_insights(
            candidate_name=current_user.full_name or "Candidate",
            job_title=analysis.job_description.title if analysis.job_description else "Target Job",
            company=analysis.job_description.company if analysis.job_description else "",
            overall_score=analysis.overall_score,
            matched_count=len([g for g in gap_responses if g.gap_status == "STRONG_MATCH"]),
            total_skills=len(gap_responses),
            gaps_list=[{"canonical_name": g.skill_name, "gap_status": g.gap_status, "priority": g.priority} for g in gap_responses]
        ),
        disclaimer="This score is an automated ATS alignment indicator and does not guarantee employment or interview selection.",
        created_at=analysis.created_at,
        gaps=gap_responses
    )

@router.post("/{analysis_id}/ai-insights")
def refresh_ai_gap_insights(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Regenerates executive career intelligence insights for an existing analysis."""
    analysis = db.query(AnalysisHistory).filter(
        AnalysisHistory.id == analysis_id,
        AnalysisHistory.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found")

    gaps = db.query(SkillGap).filter(SkillGap.analysis_id == analysis.id).all()
    gaps_list = []
    for g in gaps:
        skill = db.query(Skill).filter(Skill.id == g.skill_id).first()
        gaps_list.append({
            "canonical_name": skill.canonical_name if skill else "Skill",
            "gap_status": g.gap_status,
            "priority": g.priority
        })

    matched_count = len([g for g in gaps if g.gap_status == "STRONG_MATCH"])
    insights = llm_service.generate_gap_insights(
        candidate_name=current_user.full_name or "Candidate",
        job_title=analysis.job_description.title if analysis.job_description else "Target Role",
        company=analysis.job_description.company if analysis.job_description else "",
        overall_score=analysis.overall_score,
        matched_count=matched_count,
        total_skills=len(gaps_list),
        gaps_list=gaps_list
    )

    analysis.ai_insights = insights
    db.commit()
    return insights


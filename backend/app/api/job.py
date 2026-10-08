from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.job import JobDescription, JobSkill
from app.models.skill import Skill
from app.schemas.job import JobDescriptionCreate, JobDescriptionResponse, JobSkillResponse
from app.api.deps import get_current_active_user
from app.ai.job_analyzer import analyze_job_requirements

router = APIRouter(prefix="/job", tags=["Job Description Analysis"])

@router.post("/analyze", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED)
def analyze_job(
    job_in: JobDescriptionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not job_in.raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description text cannot be empty."
        )

    # 1. Run NLP Job Analyzer
    analysis = analyze_job_requirements(
        job_text=job_in.raw_text,
        job_title=job_in.title,
        db=db
    )

    # 2. Persist Job Description
    job_obj = JobDescription(
        user_id=current_user.id,
        title=job_in.title,
        company=job_in.company,
        raw_text=job_in.raw_text,
        seniority_level=analysis["seniority_level"]
    )
    db.add(job_obj)
    db.flush()  # to obtain job_obj.id

    # 3. Persist extracted Job Skills
    saved_job_skills = []
    for item in analysis["all_skills"]:
        js = JobSkill(
            job_id=job_obj.id,
            skill_id=item["skill_id"],
            importance=item["importance"],
            weight=item["weight"],
            context_snippet=item.get("context_snippet")
        )
        db.add(js)
        db.flush()
        
        saved_job_skills.append(JobSkillResponse(
            id=js.id,
            skill_id=item["skill_id"],
            skill_name=item["canonical_name"],
            category=item["category"],
            importance=item["importance"],
            weight=item["weight"],
            context_snippet=item.get("context_snippet")
        ))

    db.commit()
    db.refresh(job_obj)

    return JobDescriptionResponse(
        id=job_obj.id,
        user_id=job_obj.user_id,
        title=job_obj.title,
        company=job_obj.company,
        seniority_level=job_obj.seniority_level,
        raw_text=job_obj.raw_text,
        created_at=job_obj.created_at,
        job_skills=saved_job_skills
    )

@router.get("", response_model=List[JobDescriptionResponse])
def get_user_jobs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    jobs = db.query(JobDescription).filter(
        JobDescription.user_id == current_user.id
    ).order_by(JobDescription.created_at.desc()).all()
    
    responses = []
    for j in jobs:
        formatted_skills = []
        for js in j.job_skills:
            skill = db.query(Skill).filter(Skill.id == js.skill_id).first()
            formatted_skills.append(JobSkillResponse(
                id=js.id,
                skill_id=js.skill_id,
                skill_name=skill.canonical_name if skill else "Unknown",
                category=skill.category if skill else "Other",
                importance=js.importance,
                weight=js.weight,
                context_snippet=js.context_snippet
            ))
        responses.append(JobDescriptionResponse(
            id=j.id,
            user_id=j.user_id,
            title=j.title,
            company=j.company,
            seniority_level=j.seniority_level,
            raw_text=j.raw_text,
            created_at=j.created_at,
            job_skills=formatted_skills
        ))
    return responses

@router.get("/{job_id}", response_model=JobDescriptionResponse)
def get_job_by_id(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobDescription).filter(
        JobDescription.id == job_id,
        JobDescription.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")

    formatted_skills = []
    for js in job.job_skills:
        skill = db.query(Skill).filter(Skill.id == js.skill_id).first()
        formatted_skills.append(JobSkillResponse(
            id=js.id,
            skill_id=js.skill_id,
            skill_name=skill.canonical_name if skill else "Unknown",
            category=skill.category if skill else "Other",
            importance=js.importance,
            weight=js.weight,
            context_snippet=js.context_snippet
        ))

    return JobDescriptionResponse(
        id=job.id,
        user_id=job.user_id,
        title=job.title,
        company=job.company,
        seniority_level=job.seniority_level,
        raw_text=job.raw_text,
        created_at=job.created_at,
        job_skills=formatted_skills
    )

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobDescription).filter(
        JobDescription.id == job_id,
        JobDescription.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    db.delete(job)
    db.commit()

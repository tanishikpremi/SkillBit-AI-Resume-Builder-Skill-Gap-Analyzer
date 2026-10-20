from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.profile import Profile, Education, Experience, Project, UserSkill
from app.models.skill import Skill
from app.models.resume import Resume
from app.schemas.profile import (
    ProfileResponse, ProfileUpdate,
    EducationCreate, EducationResponse,
    ExperienceCreate, ExperienceResponse,
    ProjectCreate, ProjectResponse,
    UserSkillCreate, UserSkillResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("", response_model=ProfileResponse)
def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Format user_skills with skill_name and category
    user_skills_formatted = []
    for us in profile.user_skills:
        skill = db.query(Skill).filter(Skill.id == us.skill_id).first()
        user_skills_formatted.append(UserSkillResponse(
            id=us.id,
            skill_id=us.skill_id,
            skill_name=skill.canonical_name if skill else "Unknown",
            category=skill.category if skill else "Other",
            proficiency=us.proficiency,
            years_experience=us.years_experience,
            verified_by_resume=us.verified_by_resume
        ))

    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        headline=profile.headline,
        summary=profile.summary,
        phone=profile.phone,
        location=profile.location,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        portfolio_url=profile.portfolio_url,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        educations=profile.educations,
        experiences=profile.experiences,
        projects=profile.projects,
        user_skills=user_skills_formatted
    )

@router.put("", response_model=ProfileResponse)
def update_user_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return get_user_profile(current_user=current_user, db=db)

@router.post("/sync-from-resume", response_model=ProfileResponse)
def sync_profile_from_resume(
    resume_id: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Auto-populates Master Profile from the user's latest parsed resume."""
    query = db.query(Resume).filter(Resume.user_id == current_user.id)
    if resume_id:
        resume = query.filter(Resume.id == resume_id).first()
    else:
        resume = query.order_by(Resume.created_at.desc()).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found to sync from. Please upload a resume first."
        )

    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    structured = resume.structured_json or {}
    contact = structured.get("contact_info", {})

    # Sync basic contact info if present
    if contact.get("phone"): profile.phone = contact["phone"]
    if contact.get("location"): profile.location = contact["location"]
    if contact.get("linkedin"): profile.linkedin_url = contact["linkedin"]
    if contact.get("github"): profile.github_url = contact["github"]
    if structured.get("summary"): profile.summary = structured["summary"]
    if structured.get("headline"): profile.headline = structured["headline"]

    # Sync work experiences
    if structured.get("experiences") and isinstance(structured["experiences"], list):
        for exp_data in structured["experiences"]:
            company = exp_data.get("company")
            role_title = exp_data.get("role_title")
            if company and role_title:
                existing_exp = db.query(Experience).filter(
                    Experience.profile_id == profile.id,
                    Experience.company == company,
                    Experience.role_title == role_title
                ).first()
                if not existing_exp:
                    exp = Experience(
                        profile_id=profile.id,
                        company=company,
                        role_title=role_title,
                        location=exp_data.get("location"),
                        start_date=exp_data.get("start_date"),
                        end_date=exp_data.get("end_date"),
                        is_current=exp_data.get("is_current", False),
                        bullets=exp_data.get("bullets", [])
                    )
                    db.add(exp)

    # Sync educations
    if structured.get("educations") and isinstance(structured["educations"], list):
        for edu_data in structured["educations"]:
            inst = edu_data.get("institution")
            deg = edu_data.get("degree")
            if inst and deg:
                existing_edu = db.query(Education).filter(
                    Education.profile_id == profile.id,
                    Education.institution == inst,
                    Education.degree == deg
                ).first()
                if not existing_edu:
                    edu = Education(
                        profile_id=profile.id,
                        institution=inst,
                        degree=deg,
                        field_of_study=edu_data.get("field_of_study"),
                        start_date=edu_data.get("start_date"),
                        end_date=edu_data.get("end_date"),
                        gpa=edu_data.get("gpa")
                    )
                    db.add(edu)

    # Sync projects
    if structured.get("projects") and isinstance(structured["projects"], list):
        for proj_data in structured["projects"]:
            title = proj_data.get("title")
            if title:
                existing_proj = db.query(Project).filter(
                    Project.profile_id == profile.id,
                    Project.title == title
                ).first()
                if not existing_proj:
                    proj = Project(
                        profile_id=profile.id,
                        title=title,
                        description=proj_data.get("description") or (proj_data.get("bullets", [""])[0] if proj_data.get("bullets") else ""),
                        technologies=proj_data.get("technologies", []),
                        repo_url=proj_data.get("repo_url"),
                        live_url=proj_data.get("live_url")
                    )
                    db.add(proj)

    # Sync extracted skills
    extracted_skills = structured.get("extracted_skills", [])
    for es in extracted_skills:
        skill_id = es.get("skill_id")
        if skill_id:
            existing_us = db.query(UserSkill).filter(
                UserSkill.profile_id == profile.id,
                UserSkill.skill_id == skill_id
            ).first()
            if not existing_us:
                us = UserSkill(
                    profile_id=profile.id,
                    skill_id=skill_id,
                    proficiency="Intermediate",
                    verified_by_resume=True
                )
                db.add(us)

    db.commit()
    db.refresh(profile)
    return get_user_profile(current_user=current_user, db=db)


# ==================== Education ====================
@router.post("/education", response_model=EducationResponse, status_code=status.HTTP_201_CREATED)
def add_education(
    edu_in: EducationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()

    edu = Education(profile_id=profile.id, **edu_in.model_dump())
    db.add(edu)
    db.commit()
    db.refresh(edu)
    return edu

@router.delete("/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    education_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    edu = db.query(Education).filter(Education.id == education_id, Education.profile_id == profile.id).first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education record not found")
    db.delete(edu)
    db.commit()

# ==================== Experience ====================
@router.post("/experience", response_model=ExperienceResponse, status_code=status.HTTP_201_CREATED)
def add_experience(
    exp_in: ExperienceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()

    exp = Experience(profile_id=profile.id, **exp_in.model_dump())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp

@router.delete("/experience/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(
    experience_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    exp = db.query(Experience).filter(Experience.id == experience_id, Experience.profile_id == profile.id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found")
    db.delete(exp)
    db.commit()

# ==================== Project ====================
@router.post("/project", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def add_project(
    proj_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()

    proj = Project(profile_id=profile.id, **proj_in.model_dump())
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj

@router.delete("/project/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    proj = db.query(Project).filter(Project.id == project_id, Project.profile_id == profile.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project record not found")
    db.delete(proj)
    db.commit()

# ==================== User Skills ====================
@router.post("/skill", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
def add_user_skill(
    skill_in: UserSkillCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()

    skill = db.query(Skill).filter(Skill.id == skill_in.skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Canonical skill not found")

    existing_us = db.query(UserSkill).filter(
        UserSkill.profile_id == profile.id,
        UserSkill.skill_id == skill_in.skill_id
    ).first()

    if existing_us:
        existing_us.proficiency = skill_in.proficiency
        existing_us.years_experience = skill_in.years_experience
        db.commit()
        db.refresh(existing_us)
        return UserSkillResponse(
            id=existing_us.id,
            skill_id=skill.id,
            skill_name=skill.canonical_name,
            category=skill.category,
            proficiency=existing_us.proficiency,
            years_experience=existing_us.years_experience,
            verified_by_resume=existing_us.verified_by_resume
        )

    us = UserSkill(profile_id=profile.id, **skill_in.model_dump())
    db.add(us)
    db.commit()
    db.refresh(us)

    return UserSkillResponse(
        id=us.id,
        skill_id=skill.id,
        skill_name=skill.canonical_name,
        category=skill.category,
        proficiency=us.proficiency,
        years_experience=us.years_experience,
        verified_by_resume=us.verified_by_resume
    )

@router.delete("/skill/{user_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_skill(
    user_skill_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    us = db.query(UserSkill).filter(UserSkill.id == user_skill_id, UserSkill.profile_id == profile.id).first()
    if not us:
        raise HTTPException(status_code=404, detail="Skill entry not found")
    db.delete(us)
    db.commit()

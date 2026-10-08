from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.profile import Profile, Education, Experience, Project, UserSkill
from app.models.skill import Skill
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

from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.profile import Profile
from app.models.skill import Skill
import re
import httpx
from app.schemas.resume import (
    ResumeCreate, 
    ResumeResponse, 
    ResumeUploadResponse,
    RepoAnalysisRequest,
    RepoAnalysisResponse
)
from app.api.deps import get_current_active_user
from app.utils.file_storage import validate_and_save_upload, remove_file_safely
from app.ai.resume_parser import extract_text_from_file
from app.ai.section_classifier import (
    classify_resume_sections,
    extract_structured_profile_from_sections,
    compute_profile_signature
)
from app.ai.skill_extractor import extract_resume_skill_profile

router = APIRouter(prefix="/resume", tags=["Resume Management"])

@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Validate and save file securely
    file_path, filename, ext = validate_and_save_upload(file)
    
    try:
        # 2. Extract raw text from file
        raw_text = extract_text_from_file(file_path)
        if not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract any text from the uploaded document. Please ensure it is not an image-only scan."
            )
            
        # 3. Classify sections
        sections = classify_resume_sections(raw_text)
        
        # 4. Extract skills with evidence from sections
        extracted_skills = extract_resume_skill_profile(sections, db)
        
        # 4b. Automatically generate structured Candidate Profile from resume
        default_title = filename.rsplit(".", 1)[0]
        generated_profile = extract_structured_profile_from_sections(
            sections=sections,
            extracted_skills=extracted_skills,
            fallback_title=current_user.full_name or default_title
        )

        # 4c. Check if an exact existing profile/resume with no changes in information already exists
        new_sig = compute_profile_signature(generated_profile)
        raw_norm = re.sub(r"\s+", " ", raw_text.strip().lower())

        existing_resumes = db.query(Resume).filter(
            Resume.user_id == current_user.id,
            Resume.is_active == True
        ).order_by(Resume.created_at.desc()).all()

        is_exact_profile_match = False
        existing_resume_id = None
        existing_profile_title = None

        for prev_res in existing_resumes:
            prev_raw_norm = re.sub(r"\s+", " ", (prev_res.raw_text or "").strip().lower())
            prev_struct = prev_res.structured_json or {}
            prev_sig = compute_profile_signature({
                "summary": prev_struct.get("summary") or "",
                "phone": (prev_struct.get("contact_info") or {}).get("phone") or "",
                "linkedin_url": (prev_struct.get("contact_info") or {}).get("linkedin") or "",
                "github_url": (prev_struct.get("contact_info") or {}).get("github") or "",
                "skills": prev_struct.get("skills") or prev_struct.get("extracted_skills") or [],
                "experiences": prev_struct.get("experiences") or [],
                "educations": prev_struct.get("educations") or [],
                "projects": prev_struct.get("projects") or [],
            })
            if (prev_raw_norm and prev_raw_norm == raw_norm) or (prev_sig == new_sig and len(extracted_skills) > 0):
                is_exact_profile_match = True
                existing_resume_id = prev_res.id
                existing_profile_title = prev_res.title
                break

        # Also check against current user's Master Profile if not matched yet
        if not is_exact_profile_match:
            user_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
            if user_profile and (user_profile.experiences or user_profile.educations or user_profile.user_skills):
                prof_skill_names = []
                for us in user_profile.user_skills:
                    sk = db.query(Skill).filter(Skill.id == us.skill_id).first()
                    if sk:
                        prof_skill_names.append(sk.canonical_name)
                prof_sig = compute_profile_signature({
                    "summary": user_profile.summary or "",
                    "phone": user_profile.phone or "",
                    "linkedin_url": user_profile.linkedin_url or "",
                    "github_url": user_profile.github_url or "",
                    "skills": prof_skill_names,
                    "experiences": [
                        {"company": e.company, "role_title": e.role_title, "bullets": e.bullets or []}
                        for e in user_profile.experiences
                    ],
                    "educations": [
                        {"institution": ed.institution, "degree": ed.degree}
                        for ed in user_profile.educations
                    ],
                    "projects": [
                        {"title": p.title}
                        for p in user_profile.projects
                    ],
                })
                if prof_sig == new_sig:
                    is_exact_profile_match = True
                    existing_resume_id = existing_resumes[0].id if existing_resumes else None
                    existing_profile_title = user_profile.headline or "Master Career Profile"

        if is_exact_profile_match:
            profile_match_message = (
                f"Exact existing profile found ('{existing_profile_title}') with no changes in information. "
                "Would you like to make a new profile or use the existing profile for Job Match?"
            )
        else:
            profile_match_message = (
                "A candidate profile has been automatically generated from your resume. "
                "Would you like to save it as a new profile?"
            )

        # 5. Build structured JSON representation (including structured profile items)
        contact_merged = sections.get("contact_info", {}) or {}
        if generated_profile.get("location") and not contact_merged.get("location"):
            contact_merged["location"] = generated_profile["location"]

        structured_json = {
            "filename": filename,
            "full_name": generated_profile.get("full_name") or current_user.full_name,
            "headline": generated_profile.get("headline") or "",
            "contact_info": contact_merged,
            "summary": generated_profile.get("summary") or sections.get("summary", ""),
            "experience_raw": sections.get("experience_text", ""),
            "education_raw": sections.get("education_text", ""),
            "projects_raw": sections.get("projects_text", ""),
            "skills_raw": sections.get("skills_text", ""),
            "certifications_raw": sections.get("certifications_text", ""),
            "experiences": generated_profile.get("experiences", []),
            "educations": generated_profile.get("educations", []),
            "projects": generated_profile.get("projects", []),
            "skills": generated_profile.get("skills", []),
            "extracted_skills": extracted_skills
        }
        
        # Calculate baseline ATS readability score (0 - 100) based on detected core sections
        score = 20.0  # Base for having text
        if sections.get("contact_info", {}).get("email"): score += 15
        if sections.get("contact_info", {}).get("phone"): score += 10
        if sections.get("summary"): score += 15
        if sections.get("experience_text"): score += 20
        if sections.get("education_text"): score += 10
        if len(extracted_skills) >= 5: score += 10
        
        # 6. Save Resume to DB
        resume = Resume(
            user_id=current_user.id,
            title=default_title,
            source_type="uploaded",
            file_path=file_path,
            raw_text=raw_text,
            structured_json=structured_json,
            ats_score=min(score, 100.0),
            is_active=True
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        return ResumeUploadResponse(
            id=resume.id,
            user_id=resume.user_id,
            title=resume.title,
            source_type=resume.source_type,
            file_path=resume.file_path,
            structured_json=resume.structured_json,
            ats_score=resume.ats_score,
            is_active=resume.is_active,
            created_at=resume.created_at,
            updated_at=resume.updated_at,
            extracted_skills=extracted_skills,
            detected_sections={
                k: bool(v) for k, v in sections.items() if k not in ("raw_text", "headline")
            },
            generated_profile=generated_profile,
            is_exact_profile_match=is_exact_profile_match,
            existing_resume_id=existing_resume_id or resume.id,
            existing_profile_title=existing_profile_title or resume.title,
            profile_match_message=profile_match_message
        )
    except HTTPException:
        remove_file_safely(file_path)
        raise
    except Exception as e:
        remove_file_safely(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing resume: {str(e)}"
        )

@router.post("/create", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
def create_builder_resume(
    resume_in: ResumeCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    resume = Resume(
        user_id=current_user.id,
        title=resume_in.title,
        source_type="builder",
        structured_json=resume_in.structured_json,
        ats_score=85.0,  # Built with ATS-compliant builder
        is_active=True
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume

@router.get("", response_model=List[ResumeResponse])
def get_user_resumes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_active == True
    ).order_by(Resume.created_at.desc()).all()

@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume_by_id(
    resume_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@router.put("/{resume_id}", response_model=ResumeResponse)
def update_resume(
    resume_id: str,
    resume_update: ResumeCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    resume.title = resume_update.title
    resume.structured_json = resume_update.structured_json
    db.commit()
    db.refresh(resume)
    return resume

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if resume.file_path:
        remove_file_safely(resume.file_path)
        
    db.delete(resume)
    db.commit()

from fastapi.responses import Response
from app.services.pdf_service import build_ats_resume_pdf

@router.get("/{resume_id}/export")
def export_resume_pdf(
    resume_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_payload = {
        "title": resume.title,
        "full_name": current_user.full_name,
        **(resume.structured_json or {})
    }

    pdf_buffer = build_ats_resume_pdf(resume_payload)
    safe_filename = f"{resume.title.replace(' ', '_')}_ATS.pdf"
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"'
        }
    )

def _parse_github_url(url: str):
    clean = (url or "").strip()
    clean = re.sub(r"^(?:https?:\/\/)?(?:www\.)?github\.com\/", "", clean, flags=re.IGNORECASE)
    clean = clean.rstrip("/").removesuffix(".git").strip("/")
    parts = clean.split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    elif len(parts) == 1 and parts[0]:
        return None, parts[0]
    return None, None

@router.post("/analyze-repo", response_model=RepoAnalysisResponse)
def analyze_github_repository(
    payload: RepoAnalysisRequest,
    current_user: User = Depends(get_current_active_user)
):
    owner, repo = _parse_github_url(payload.repo_url)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository URL. Please provide a link like 'https://github.com/owner/repository'."
        )

    canonical_repo_url = f"https://github.com/{owner}/{repo}" if owner else f"https://github.com/{repo}"
    repo_data = {}

    # 1. Fetch public GitHub metadata if owner and repo are identified
    if owner and repo:
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(
                    f"https://api.github.com/repos/{owner}/{repo}",
                    headers={"User-Agent": "SkillBit-AI", "Accept": "application/vnd.github.v3+json"}
                )
                if resp.status_code == 200:
                    repo_data = resp.json()
        except Exception:
            pass

    # Extract metadata fields
    raw_name = repo_data.get("name") or repo
    description = repo_data.get("description") or ""
    stars = repo_data.get("stargazers_count")
    primary_lang = repo_data.get("language")
    topics = repo_data.get("topics", [])

    # Format technologies list
    technologies = []
    if primary_lang:
        technologies.append(primary_lang)
    for t in topics:
        clean_topic = t.replace("-", " ").title()
        if clean_topic.lower() not in [x.lower() for x in technologies]:
            technologies.append(clean_topic)
    if not technologies:
        technologies = ["Python", "JavaScript"]

    # Refine project title
    clean_title = payload.project_title.strip() if (payload.project_title and payload.project_title.strip()) else ""
    if not clean_title:
        words = re.split(r"[-_]+", raw_name)
        clean_title = " ".join(w.capitalize() if len(w) > 3 else w.upper() for w in words)

    # Generate 2-3 high-impact STAR accomplishment bullets
    bullets = []
    tech_str = ", ".join(technologies[:3])
    
    # Bullet 1: Architecture & Purpose
    if description:
        bullets.append(f"Architected and deployed {clean_title} utilizing {tech_str}, implementing {description.rstrip('.')}.")
    else:
        bullets.append(f"Architected and deployed {clean_title} utilizing {tech_str}, implementing core modular components and high-throughput workflows.")

    # Bullet 2: Engineering & Quality
    bullets.append(f"Engineered scalable data processing pipelines and asynchronous endpoints, optimizing response latency by 35% with robust error boundaries.")

    # Bullet 3: Deployment & Delivery
    bullets.append(f"Automated containerized deployment using Docker and CI/CD pipelines, facilitating zero-downtime releases and seamless cross-environment reproducibility.")

    return RepoAnalysisResponse(
        title=clean_title,
        repo_url=canonical_repo_url,
        description=description,
        technologies=technologies[:6],
        bullets=bullets,
        stars=stars,
        language=primary_lang
    )



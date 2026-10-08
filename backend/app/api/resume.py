from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeResponse, ResumeUploadResponse
from app.api.deps import get_current_active_user
from app.utils.file_storage import validate_and_save_upload, remove_file_safely
from app.ai.resume_parser import extract_text_from_file
from app.ai.section_classifier import classify_resume_sections
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
        
        # 5. Build structured JSON representation
        structured_json = {
            "filename": filename,
            "contact_info": sections.get("contact_info", {}),
            "summary": sections.get("summary", ""),
            "experience_raw": sections.get("experience_text", ""),
            "education_raw": sections.get("education_text", ""),
            "projects_raw": sections.get("projects_text", ""),
            "skills_raw": sections.get("skills_text", ""),
            "certifications_raw": sections.get("certifications_text", ""),
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
            title=filename.rsplit(".", 1)[0],
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
                k: bool(v) for k, v in sections.items() if k != "raw_text"
            }
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


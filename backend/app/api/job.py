import json
import re
from typing import List, Optional, Tuple
from urllib.parse import urlparse
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.job import JobDescription, JobSkill
from app.models.skill import Skill
from app.schemas.job import (
    JobDescriptionCreate,
    JobDescriptionResponse,
    JobSkillResponse,
    JobExtractUrlRequest,
    JobExtractedDetailsResponse,
    JobJsonLdExtractResponse,
)
from app.api.deps import get_current_active_user
from app.ai.job_analyzer import analyze_job_requirements
from app.ai.resume_parser import extract_text_from_file, clean_extracted_text
from app.utils.file_storage import validate_and_save_upload, remove_file_safely
from app.services.job_sources import validate_external_url, sanitize_untrusted_job_content
from app.services.json_ld_extractor import extract_job_posting_from_json_ld, clean_html_description
from app.services.portal_jd_extractor import extract_job_from_any_portal_url

router = APIRouter(prefix="/job", tags=["Job Description Analysis"])


def _infer_title_and_company_from_jd_text(
    raw_text: str,
    fallback_title: str = "",
    fallback_company: str = "",
) -> Tuple[str, str]:
    lines = [ln.strip() for ln in (raw_text or "").split("\n") if ln.strip()]
    title = ""
    company = ""

    for line in lines[:20]:
        role_match = re.match(
            r"^(?:role|job\s*title|position|title|opening)\s*[:\-]\s*(.+)$",
            line,
            re.IGNORECASE,
        )
        if role_match and not title:
            title = role_match.group(1).strip()
            continue

        comp_match = re.match(
            r"^(?:company|organization|employer|client|hiring\s+company)\s*[:\-]\s*(.+)$",
            line,
            re.IGNORECASE,
        )
        if comp_match and not company:
            company = comp_match.group(1).strip()
            continue

        at_match = re.match(r"^([A-Z][A-Za-z0-9\s\/,&\-\(\)\.]{3,65})\s+at\s+([A-Z][A-Za-z0-9\s\.,&\-]{2,50})$", line)
        if at_match and not title and not company:
            title = at_match.group(1).strip()
            company = at_match.group(2).strip()

    if not title and lines:
        first_line = re.sub(r"^[#*\-\s]+", "", lines[0]).strip()
        if 3 <= len(first_line) <= 90:
            title = first_line

    if not title:
        title = fallback_title or "Target Role"
    if not company:
        company = fallback_company or ""

    return title[:120], company[:120]


@router.post("/extract-file", response_model=JobExtractedDetailsResponse)
def extract_job_from_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Parses an uploaded Job Description file (.pdf, .txt, .docx) and extracts
    the role title, company name, cleaned JD text, seniority, and detected skills count.
    """
    file_path, filename, _ = validate_and_save_upload(file)
    try:
        raw_text = extract_text_from_file(file_path)
        if not raw_text or not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from the uploaded job description file.",
            )
        fallback_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
        title, company = _infer_title_and_company_from_jd_text(raw_text, fallback_title=fallback_name)
        analysis = analyze_job_requirements(job_text=raw_text, job_title=title, db=db)
        return JobExtractedDetailsResponse(
            title=title,
            company=company or None,
            raw_text=raw_text,
            seniority_level=analysis.get("seniority_level"),
            source_type="file",
            source_label=filename,
            skills_detected_count=analysis.get("total_skills_count", 0),
        )
    finally:
        remove_file_safely(file_path)


@router.post("/extract-url", response_model=JobExtractedDetailsResponse)
def extract_job_from_url(
    payload: JobExtractUrlRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Fetches a public Job Description URL (HTML job posting, JSON-LD JobPosting schema,
    direct PDF link, or plain text link) and extracts the role title, company, and JD text.
    """
    is_valid, clean_url_or_err = validate_external_url(payload.url, resolve_dns=False)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or restricted URL: {clean_url_or_err}",
        )

    parsed_url = urlparse(clean_url_or_err)
    host_lower = (parsed_url.hostname or "").lower()
    host_company = host_lower.replace("www.", "").replace("boards.", "").replace("jobs.", "").split(".")[0].title()

    # Fast-path for the 6 major job portals (LinkedIn, Naukri, Indeed, Glassdoor, Unstop, Internshala)
    major_portals = ("linkedin.com", "naukri.com", "indeed.", "glassdoor.", "unstop.com", "internshala.com")
    if any(p in host_lower for p in major_portals):
        portal_res = extract_job_from_any_portal_url(clean_url_or_err)
        if portal_res and portal_res.get("job_description"):
            job_role = portal_res["job_role"] or "Target Role"
            company_name = portal_res.get("company_name") or host_company
            job_description = portal_res["job_description"]
            analysis = analyze_job_requirements(job_text=job_description, job_title=job_role, db=db)
            return JobExtractedDetailsResponse(
                title=job_role[:120],
                company=company_name[:120] if company_name else None,
                raw_text=job_description,
                job_role=job_role[:120],
                company_name=company_name[:120] if company_name else None,
                job_description=job_description,
                json_ld_found=True,
                seniority_level=analysis.get("seniority_level"),
                source_type="url",
                source_label=clean_url_or_err,
                skills_detected_count=analysis.get("total_skills_count", 0),
            )

    # Enhanced browser fingerprint headers to bypass basic Cloudflare/bot challenges
    browser_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/pdf,text/plain,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/",
    }

    # Special handling for LinkedIn job postings:
    # Public guest API: https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}
    urls_to_try = [clean_url_or_err]
    if "linkedin.com" in (parsed_url.hostname or "").lower():
        job_id_match = re.search(r"(\d{8,})", clean_url_or_err)
        if job_id_match:
            guest_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id_match.group(1)}"
            urls_to_try.insert(0, guest_url)

    resp = None
    last_status = None
    try:
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            for target_url in urls_to_try:
                try:
                    r = client.get(target_url, headers=browser_headers)
                    if r.status_code == 200 and r.text and len(r.text.strip()) > 50:
                        resp = r
                        break
                    last_status = r.status_code
                except Exception:
                    continue

            if resp is None:
                if last_status and last_status in (401, 403):
                    domain_name = parsed_url.hostname or "The job portal"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"{domain_name} returned HTTP {last_status} (protected by bot prevention or login wall). "
                            "Please copy the text directly from the open job page and paste it into the Job Description box, "
                            "or upload it as a PDF/TXT file."
                        ),
                    )
                elif last_status and last_status >= 400:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Remote job page returned HTTP {last_status}. If the site blocks automated requests, download the JD as PDF/TXT or paste the text directly.",
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Could not retrieve job description from that URL. Please verify the link is publicly accessible or paste the text directly.",
                    )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not fetch the job URL ({type(exc).__name__}). Please verify the link is publicly accessible.",
        )

    content_type = (resp.headers.get("content-type") or "").lower()

    # Case 1: URL points directly to a PDF document
    if "application/pdf" in content_type or parsed_url.path.lower().endswith(".pdf"):
        try:
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            doc = fitz.open(stream=resp.content, filetype="pdf")
            blocks = []
            for page in doc:
                for b in page.get_text("blocks", sort=True):
                    if b[6] == 0 and b[4].strip():
                        blocks.append(b[4].strip())
            doc.close()
            raw_text = clean_extracted_text("\n\n".join(blocks))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to parse remote PDF: {exc}")

        title, company = _infer_title_and_company_from_jd_text(raw_text, fallback_company=host_company)
        analysis = analyze_job_requirements(job_text=raw_text, job_title=title, db=db)
        return JobExtractedDetailsResponse(
            title=title,
            company=company or host_company,
            raw_text=raw_text,
            seniority_level=analysis.get("seniority_level"),
            source_type="url_pdf",
            source_label=clean_url_or_err,
            skills_detected_count=analysis.get("total_skills_count", 0),
        )

    # Case 2: Parse HTML strictly for Schema.org JobPosting JSON-LD
    html_text = resp.text or ""
    ld_result = extract_job_posting_from_json_ld(html_text)

    if not ld_result["found"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No Schema.org 'JobPosting' JSON-LD found on this page. "
                "To match this job, please copy the text directly from the page and paste it into the Job Description box, "
                "or upload it as a PDF/TXT file."
            ),
        )

    job_role = ld_result["job_role"] or "Target Role"
    company_name = ld_result["company_name"] or host_company
    job_description = ld_result["job_description"]

    if not job_description or len(job_description.strip()) < 25:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The Schema.org JobPosting object on this page has an empty or insufficient description. "
                "Please paste the job description text directly or upload a PDF/TXT file."
            ),
        )

    analysis = analyze_job_requirements(job_text=job_description, job_title=job_role, db=db)
    return JobExtractedDetailsResponse(
        title=job_role[:120],
        company=company_name[:120] if company_name else None,
        raw_text=job_description,
        job_role=job_role[:120],
        company_name=company_name[:120] if company_name else None,
        job_description=job_description,
        json_ld_found=True,
        seniority_level=analysis.get("seniority_level"),
        source_type="url",
        source_label=clean_url_or_err,
        skills_detected_count=analysis.get("total_skills_count", 0),
    )


@router.post("/extract-json-ld", response_model=JobJsonLdExtractResponse)
def extract_json_ld_direct(
    payload: JobExtractUrlRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Dedicated endpoint for Schema.org JSON-LD extraction:
    Parses <script type="application/ld+json"> from a URL and retrieves strictly:
      - company_name (from hiringOrganization.name)
      - job_role (from title)
      - job_description (from description)
    Handles nested @graph objects, JSON errors, and returns a clear fallback response without using an LLM.
    """
    is_valid, clean_url_or_err = validate_external_url(payload.url, resolve_dns=False)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or restricted URL: {clean_url_or_err}",
        )

    browser_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/pdf,text/plain,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
    }

    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(clean_url_or_err, headers=browser_headers)
            if resp.status_code >= 400:
                return JobJsonLdExtractResponse(
                    success=False,
                    company_name=None,
                    job_role=None,
                    job_description=None,
                    message=f"Remote page returned HTTP {resp.status_code}. Schema.org JobPosting JSON-LD unavailable.",
                )
    except Exception as exc:
        return JobJsonLdExtractResponse(
            success=False,
            company_name=None,
            job_role=None,
            job_description=None,
            message=f"Could not connect to URL ({type(exc).__name__}). JSON-LD unavailable.",
        )

    res = extract_job_posting_from_json_ld(resp.text or "")
    return JobJsonLdExtractResponse(
        success=res["found"],
        company_name=res["company_name"],
        job_role=res["job_role"],
        job_description=res["job_description"],
        message=res["message"],
    )



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

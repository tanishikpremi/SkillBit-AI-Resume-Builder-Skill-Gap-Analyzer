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
)
from app.api.deps import get_current_active_user
from app.ai.job_analyzer import analyze_job_requirements
from app.ai.resume_parser import extract_text_from_file, clean_extracted_text
from app.utils.file_storage import validate_and_save_upload, remove_file_safely
from app.services.job_sources import validate_external_url, sanitize_untrusted_job_content

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
    host_company = (parsed_url.hostname or "").replace("www.", "").replace("boards.", "").replace("jobs.", "").split(".")[0].title()

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

    # Case 2: HTML or Plain Text Job Posting
    html_text = resp.text or ""
    extracted_title = ""
    extracted_company = ""
    extracted_body = ""

    # 2a. Check for Schema.org JobPosting JSON-LD (used by Greenhouse, Lever, LinkedIn, Workday, Indeed)
    ld_matches = re.findall(
        r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
        html_text,
         flags=re.IGNORECASE | re.DOTALL,
    )
    for ld_raw in ld_matches:
        try:
            ld_data = json.loads(ld_raw.strip())
            candidates = ld_data if isinstance(ld_data, list) else [ld_data]
            if isinstance(ld_data, dict) and isinstance(ld_data.get("@graph"), list):
                candidates.extend(ld_data["@graph"])
            for item in candidates:
                if isinstance(item, dict) and "JobPosting" in str(item.get("@type", "")):
                    extracted_title = str(item.get("title") or "").strip()
                    org = item.get("hiringOrganization")
                    if isinstance(org, dict):
                        extracted_company = str(org.get("name") or "").strip()
                    elif isinstance(org, str):
                        extracted_company = org.strip()
                    desc_parts = [
                        str(item.get("description") or ""),
                        str(item.get("qualifications") or ""),
                        str(item.get("skills") or ""),
                        str(item.get("experienceRequirements") or ""),
                    ]
                    extracted_body = sanitize_untrusted_job_content("\n\n".join(p for p in desc_parts if p), max_length=10000)
                    if extracted_body:
                        break
        except Exception:
            continue

    # 2b. Check <title>, og:title, og:site_name, and <h1> if JSON-LD wasn't present
    if not extracted_title:
        og_title = re.search(r"<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)[\"']", html_text, re.IGNORECASE)
        h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", html_text, re.IGNORECASE | re.DOTALL)
        title_tag = re.search(r"<title[^>]*>(.*?)</title>", html_text, re.IGNORECASE | re.DOTALL)
        raw_t = (
            (og_title.group(1) if og_title else "")
            or (re.sub(r"<[^>]+>", "", h1_match.group(1)) if h1_match else "")
            or (title_tag.group(1) if title_tag else "")
        )
        extracted_title = sanitize_untrusted_job_content(raw_t, max_length=140)
        # Split "Role at Company | Site" or "Role - Company"
        if " at " in extracted_title and not extracted_company:
            parts = extracted_title.split(" at ", 1)
            extracted_title = parts[0].strip()
            extracted_company = parts[1].split("|")[0].split("-")[0].strip()
        elif " - " in extracted_title and not extracted_company:
            parts = extracted_title.split(" - ")
            extracted_title = parts[0].strip()
            extracted_company = parts[1].split("|")[0].strip()

    if not extracted_company:
        og_site = re.search(r"<meta[^>]+property=[\"']og:site_name[\"'][^>]+content=[\"']([^\"']+)[\"']", html_text, re.IGNORECASE)
        if og_site:
            extracted_company = sanitize_untrusted_job_content(og_site.group(1), max_length=100)

    if not extracted_body:
        # Remove nav, header, footer, script, style, svg blocks before extracting body text
        stripped_html = re.sub(
            r"<(script|style|svg|noscript|nav|footer|header)[^>]*>.*?</\1>",
            " ",
            html_text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        extracted_body = clean_extracted_text(sanitize_untrusted_job_content(stripped_html, max_length=10000))

    if not extracted_body or len(extracted_body.strip()) < 25:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract sufficient job description text from that URL. Try uploading the JD as a PDF/TXT file or pasting the text.",
        )

    inferred_title, inferred_company = _infer_title_and_company_from_jd_text(
        extracted_body,
        fallback_title=extracted_title or "Target Role",
        fallback_company=extracted_company or host_company,
    )
    final_title = extracted_title or inferred_title
    final_company = extracted_company or inferred_company or host_company

    analysis = analyze_job_requirements(job_text=extracted_body, job_title=final_title, db=db)
    return JobExtractedDetailsResponse(
        title=final_title[:120],
        company=final_company[:120] if final_company else None,
        raw_text=extracted_body,
        seniority_level=analysis.get("seniority_level"),
        source_type="url",
        source_label=clean_url_or_err,
        skills_detected_count=analysis.get("total_skills_count", 0),
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

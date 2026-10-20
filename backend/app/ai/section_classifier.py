import re
import hashlib
import json
from typing import Dict, List, Any, Optional

# Section heading detection patterns
SECTION_PATTERNS = {
    "summary": re.compile(
        r"^(?:professional\s+summary|summary|profile|about\s+me|career\s+objective|executive\s+summary|objective)\b",
        re.IGNORECASE
    ),
    "experience": re.compile(
        r"^(?:work\s+experience|professional\s+experience|employment\s+history|experience|work\s+history|career\s+history|internships?)\b",
        re.IGNORECASE
    ),
    "education": re.compile(
        r"^(?:education|academic\s+background|academic\s+history|qualifications|degrees|academics)\b",
        re.IGNORECASE
    ),
    "projects": re.compile(
        r"^(?:projects|technical\s+projects|personal\s+projects|key\s+projects|academic\s+projects|selected\s+projects)\b",
        re.IGNORECASE
    ),
    "skills": re.compile(
        r"^(?:skills|technical\s+skills|core\s+competencies|technologies|technical\s+strengths|skills\s+&\s+tools|tech\s+stack)\b",
        re.IGNORECASE
    ),
    "certifications": re.compile(
        r"^(?:certifications|licenses|credentials|courses|training\s+&\s+certifications|achievements)\b",
        re.IGNORECASE
    )
}

CONTACT_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
CONTACT_PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
CONTACT_LINKEDIN_PATTERN = re.compile(r"(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+", re.IGNORECASE)
CONTACT_GITHUB_PATTERN = re.compile(r"(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+", re.IGNORECASE)
LOCATION_PATTERN = re.compile(
    r"\b([A-Z][a-zA-Z\s.]{2,25},\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]{2,20})|Remote)\b"
)
DATE_RANGE_PATTERN = re.compile(
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*(?:[-–—]|to)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current|Now)",
    re.IGNORECASE
)
GPA_PATTERN = re.compile(r"(?:GPA|CGPA)\s*[:\-]?\s*(\d+\.\d+(?:\/\d+(?:\.\d+)?)?)", re.IGNORECASE)
DEGREE_KEYWORDS = re.compile(
    r"\b(?:B\.?S\.?|B\.?A\.?|B\.?Tech\.?|B\.?E\.?|M\.?S\.?|M\.?A\.?|M\.?Tech\.?|M\.?B\.?A\.?|Ph\.?D\.?|Bachelor|Master|Associate|Diploma)\b",
    re.IGNORECASE
)
ROLE_KEYWORDS = re.compile(
    r"\b(?:Engineer|Developer|Architect|Scientist|Analyst|Manager|Lead|Intern|Consultant|Designer|Administrator|Specialist|Director|Researcher)\b",
    re.IGNORECASE
)


def classify_resume_sections(raw_text: str) -> Dict[str, Any]:
    """
    Parses full resume text into classified sections and extracts basic contact details.
    """
    lines = raw_text.split("\n")

    sections: Dict[str, List[str]] = {
        "header": [],
        "summary": [],
        "experience": [],
        "education": [],
        "projects": [],
        "skills": [],
        "certifications": [],
        "other": []
    }

    current_section = "header"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line is a section heading
        is_heading = False
        if len(stripped) < 50:
            clean_heading = re.sub(r"[:\-_]+$", "", stripped).strip()

            for section_name, pattern in SECTION_PATTERNS.items():
                if pattern.match(clean_heading):
                    current_section = section_name
                    is_heading = True
                    break

        if not is_heading:
            sections[current_section].append(stripped)

    # Extract Contact Information from header or top lines
    header_text = "\n".join(sections["header"]) + "\n" + raw_text[:600]

    email_match = CONTACT_EMAIL_PATTERN.search(header_text)
    phone_match = CONTACT_PHONE_PATTERN.search(header_text)
    linkedin_match = CONTACT_LINKEDIN_PATTERN.search(header_text)
    github_match = CONTACT_GITHUB_PATTERN.search(header_text)
    location_match = LOCATION_PATTERN.search(header_text)

    # Detect candidate name and potential headline from header lines
    candidate_name = None
    candidate_headline = None
    for h_line in sections["header"][:5]:
        clean_line = h_line.strip()
        if "|" in clean_line and ("@" in clean_line or "linkedin" in clean_line.lower() or "github" in clean_line.lower()):
            continue
        if (
            clean_line
            and len(clean_line) <= 65
            and not ("@" in clean_line or "http" in clean_line.lower() or "github" in clean_line.lower() or "linkedin" in clean_line.lower())
            and not re.search(r"\d{3,}", clean_line)
        ):
            if candidate_name is None:
                candidate_name = clean_line
            elif candidate_headline is None and ROLE_KEYWORDS.search(clean_line):
                candidate_headline = clean_line

    contact_info = {
        "full_name": candidate_name,
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "location": location_match.group(1).strip() if location_match else None,
        "linkedin": linkedin_match.group(0) if linkedin_match else None,
        "github": github_match.group(0) if github_match else None,
    }

    structured_sections = {
        "contact_info": contact_info,
        "headline": candidate_headline,
        "summary": "\n".join(sections["summary"]).strip(),
        "experience_text": "\n".join(sections["experience"]).strip(),
        "education_text": "\n".join(sections["education"]).strip(),
        "projects_text": "\n".join(sections["projects"]).strip(),
        "skills_text": "\n".join(sections["skills"]).strip(),
        "certifications_text": "\n".join(sections["certifications"]).strip(),
        "raw_text": raw_text
    }

    return structured_sections


def parse_experience_entries(experience_text: str) -> List[Dict[str, Any]]:
    """Parses raw experience section text into structured work experience dictionaries."""
    if not experience_text or not experience_text.strip():
        return []

    lines = [l.strip() for l in experience_text.split("\n") if l.strip()]
    entries: List[Dict[str, Any]] = []
    current_entry: Optional[Dict[str, Any]] = None

    for line in lines:
        is_bullet = bool(re.match(r"^[•\-\*▪▸]\s*", line))
        date_match = DATE_RANGE_PATTERN.search(line)

        # A line is treated as a job header if it is not a bullet and has either a date range, pipe separator, or ' at '
        if not is_bullet and (date_match or "|" in line or " — " in line or " - " in line or re.search(r"\bat\b", line, re.IGNORECASE)) and len(line) < 130:
            if current_entry:
                entries.append(current_entry)

            start_date = date_match.group(1).strip() if date_match else ""
            end_date = date_match.group(2).strip() if date_match else ""
            is_current = end_date.lower() in ("present", "current", "now")

            # Remove date substring to parse role and company cleanly
            line_no_date = DATE_RANGE_PATTERN.sub("", line).strip(" |—-(),")
            parts = [p.strip() for p in re.split(r"\s*(?:\||—|–|\bat\b)\s*", line_no_date) if p.strip()]

            role_title = parts[0] if len(parts) >= 1 else "Software Engineer"
            company = parts[1] if len(parts) >= 2 else "Technology Company"
            location = parts[2] if len(parts) >= 3 else ""

            current_entry = {
                "company": company[:120],
                "role_title": role_title[:120],
                "location": location[:100],
                "start_date": start_date,
                "end_date": end_date,
                "is_current": is_current,
                "bullets": []
            }
        else:
            clean_bullet = re.sub(r"^[•\-\*▪▸]\s*", "", line).strip()
            if not clean_bullet:
                continue
            if current_entry is None:
                current_entry = {
                    "company": "Professional Experience",
                    "role_title": "Software Engineer",
                    "location": "",
                    "start_date": "",
                    "end_date": "Present",
                    "is_current": True,
                    "bullets": [clean_bullet]
                }
            else:
                current_entry["bullets"].append(clean_bullet)

    if current_entry:
        entries.append(current_entry)

    return entries


def parse_education_entries(education_text: str) -> List[Dict[str, Any]]:
    """Parses raw education section text into structured education dictionaries."""
    if not education_text or not education_text.strip():
        return []

    lines = [l.strip() for l in education_text.split("\n") if l.strip()]
    entries: List[Dict[str, Any]] = []

    for line in lines:
        clean_line = re.sub(r"^[•\-\*]\s*", "", line).strip()
        if not clean_line:
            continue

        gpa_match = GPA_PATTERN.search(clean_line)
        gpa = gpa_match.group(1) if gpa_match else None

        date_match = DATE_RANGE_PATTERN.search(clean_line)
        start_date = date_match.group(1) if date_match else None
        end_date = date_match.group(2) if date_match else None

        # Strip date and GPA to split degree and institution
        core_line = DATE_RANGE_PATTERN.sub("", clean_line)
        core_line = GPA_PATTERN.sub("", core_line).strip(" |—-(),")
        parts = [p.strip() for p in re.split(r"\s*(?:\||—|–|,)\s*", core_line) if p.strip()]

        if not parts:
            continue

        degree_part = parts[0]
        institution = parts[1] if len(parts) >= 2 else "University / Institution"

        # If institution keyword is in first part and degree in second, swap them
        if any(w in degree_part.lower() for w in ("university", "institute", "college", "school")) and len(parts) >= 2:
            institution, degree_part = parts[0], parts[1]

        field_of_study = None
        if re.search(r"\bin\b", degree_part, re.IGNORECASE):
            deg_split = re.split(r"\s+in\s+", degree_part, maxsplit=1, flags=re.IGNORECASE)
            degree = deg_split[0].strip()
            field_of_study = deg_split[1].strip()
        else:
            degree = degree_part

        entries.append({
            "institution": institution[:200],
            "degree": degree[:150],
            "field_of_study": field_of_study[:150] if field_of_study else None,
            "start_date": start_date,
            "end_date": end_date,
            "gpa": gpa
        })

    return entries


def parse_project_entries(projects_text: str) -> List[Dict[str, Any]]:
    """Parses raw projects section text into structured project dictionaries."""
    if not projects_text or not projects_text.strip():
        return []

    lines = [l.strip() for l in projects_text.split("\n") if l.strip()]
    projects: List[Dict[str, Any]] = []
    current_proj: Optional[Dict[str, Any]] = None

    for line in lines:
        is_bullet = bool(re.match(r"^[•\-\*▪▸]\s*", line))
        if not is_bullet and len(line) < 110 and ("|" in line or "—" in line or ":" in line or len(line.split()) <= 8):
            if current_proj:
                projects.append(current_proj)

            gh_match = CONTACT_GITHUB_PATTERN.search(line)
            repo_url = gh_match.group(0) if gh_match else ""
            if repo_url and not repo_url.startswith("http"):
                repo_url = "https://" + repo_url

            parts = [p.strip() for p in re.split(r"\s*(?:\||—|–|:)\s*", line) if p.strip()]
            title = parts[0] if parts else "Technical Project"
            techs: List[str] = []
            if len(parts) >= 2:
                techs = [t.strip() for t in parts[1].split(",") if t.strip() and "github.com" not in t.lower()]

            current_proj = {
                "title": title[:150],
                "description": "",
                "technologies": techs[:8],
                "repo_url": repo_url,
                "live_url": "",
                "bullets": []
            }
        else:
            clean_bullet = re.sub(r"^[•\-\*▪▸]\s*", "", line).strip()
            if not clean_bullet:
                continue
            if current_proj is None:
                current_proj = {
                    "title": clean_bullet[:60],
                    "description": clean_bullet,
                    "technologies": [],
                    "repo_url": "",
                    "live_url": "",
                    "bullets": [clean_bullet]
                }
            else:
                current_proj["bullets"].append(clean_bullet)
                if not current_proj["description"]:
                    current_proj["description"] = clean_bullet
                else:
                    current_proj["description"] = f"{current_proj['description']} {clean_bullet}"

    if current_proj:
        projects.append(current_proj)

    return projects


def extract_structured_profile_from_sections(
    sections: Dict[str, Any],
    extracted_skills: List[Dict[str, Any]],
    fallback_title: str = "Candidate Profile"
) -> Dict[str, Any]:
    """
    Automatically builds a complete structured Candidate Profile from parsed resume sections and skills.
    """
    contact = sections.get("contact_info", {}) or {}
    experiences = parse_experience_entries(sections.get("experience_text", ""))
    educations = parse_education_entries(sections.get("education_text", ""))
    projects = parse_project_entries(sections.get("projects_text", ""))
    skill_names = [s.get("canonical_name") for s in extracted_skills if s.get("canonical_name")]

    # Infer headline from header, first experience role, or summary
    headline = sections.get("headline")
    if not headline and experiences:
        headline = experiences[0].get("role_title")
    if not headline and sections.get("summary"):
        first_sentence = sections["summary"].split(".")[0].strip()
        if len(first_sentence) <= 80:
            headline = first_sentence
    if not headline:
        if skill_names:
            headline = f"{skill_names[0]} & {skill_names[1]} Specialist" if len(skill_names) >= 2 else f"{skill_names[0]} Professional"
        else:
            headline = fallback_title

    summary = sections.get("summary", "").strip()
    if not summary:
        top_skills = ", ".join(skill_names[:5]) if skill_names else "software engineering"
        summary = f"{headline} with demonstrated experience in {top_skills}."

    full_name = contact.get("full_name") or fallback_title

    return {
        "full_name": full_name,
        "headline": headline,
        "summary": summary,
        "phone": contact.get("phone") or "",
        "email": contact.get("email") or "",
        "location": contact.get("location") or "",
        "linkedin_url": contact.get("linkedin") or "",
        "github_url": contact.get("github") or "",
        "skills": skill_names,
        "extracted_skills": extracted_skills,
        "experiences": experiences,
        "educations": educations,
        "projects": projects,
    }


def compute_profile_signature(profile_data: Dict[str, Any]) -> str:
    """
    Computes a deterministic canonical signature of a profile's core information
    (contact, headline, summary, canonical skills, experiences, educations, projects)
    to detect if two profiles have the exact same information with no changes.
    """
    skills_sorted = sorted(
        list({
            (s.get("canonical_name", "") if isinstance(s, dict) else str(s)).strip().lower()
            for s in (profile_data.get("skills") or profile_data.get("extracted_skills") or [])
            if s
        })
    )
    exp_norm = sorted([
        f"{(e.get('company') or '').strip().lower()}|{(e.get('role_title') or '').strip().lower()}|{len(e.get('bullets') or [])}"
        for e in (profile_data.get("experiences") or [])
    ])
    edu_norm = sorted([
        f"{(ed.get('institution') or '').strip().lower()}|{(ed.get('degree') or '').strip().lower()}"
        for ed in (profile_data.get("educations") or [])
    ])
    proj_norm = sorted([
        f"{(p.get('title') or '').strip().lower()}"
        for p in (profile_data.get("projects") or [])
    ])

    canonical_payload = {
        "summary": re.sub(r"\s+", " ", (profile_data.get("summary") or "").strip().lower()),
        "phone": re.sub(r"\D+", "", (profile_data.get("phone") or "")),
        "linkedin": (profile_data.get("linkedin_url") or "").strip().lower().rstrip("/"),
        "github": (profile_data.get("github_url") or "").strip().lower().rstrip("/"),
        "skills": skills_sorted,
        "experiences": exp_norm,
        "educations": edu_norm,
        "projects": proj_norm,
    }
    serialized = json.dumps(canonical_payload, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

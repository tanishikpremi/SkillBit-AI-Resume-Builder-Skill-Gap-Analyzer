import re
from typing import Dict, List, Any

# Section heading detection patterns
SECTION_PATTERNS = {
    "summary": re.compile(
        r"^(?:professional\s+summary|summary|profile|about\s+me|career\s+objective|executive\s+summary)\b",
        re.IGNORECASE
    ),
    "experience": re.compile(
        r"^(?:work\s+experience|professional\s+experience|employment\s+history|experience|work\s+history|career\s+history)\b",
        re.IGNORECASE
    ),
    "education": re.compile(
        r"^(?:education|academic\s+background|academic\s+history|qualifications|degrees)\b",
        re.IGNORECASE
    ),
    "projects": re.compile(
        r"^(?:projects|technical\s+projects|personal\s+projects|key\s+projects|academic\s+projects)\b",
        re.IGNORECASE
    ),
    "skills": re.compile(
        r"^(?:skills|technical\s+skills|core\s+competencies|technologies|technical\s+strengths|skills\s+&\s+tools|tech\s+stack)\b",
        re.IGNORECASE
    ),
    "certifications": re.compile(
        r"^(?:certifications|licenses|credentials|courses|training\s+&\s+certifications)\b",
        re.IGNORECASE
    )
}

CONTACT_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
CONTACT_PHONE_PATTERN = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
CONTACT_LINKEDIN_PATTERN = re.compile(r"(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+", re.IGNORECASE)
CONTACT_GITHUB_PATTERN = re.compile(r"(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+", re.IGNORECASE)

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
        # Section headings are typically short (< 50 chars) and match section keywords
        is_heading = False
        if len(stripped) < 50:
            # Strip trailing colons or dashes
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
    
    contact_info = {
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "linkedin": linkedin_match.group(0) if linkedin_match else None,
        "github": github_match.group(0) if github_match else None,
    }

    # Format joined string blocks for each section
    structured_sections = {
        "contact_info": contact_info,
        "summary": "\n".join(sections["summary"]).strip(),
        "experience_text": "\n".join(sections["experience"]).strip(),
        "education_text": "\n".join(sections["education"]).strip(),
        "projects_text": "\n".join(sections["projects"]).strip(),
        "skills_text": "\n".join(sections["skills"]).strip(),
        "certifications_text": "\n".join(sections["certifications"]).strip(),
        "raw_text": raw_text
    }
    
    return structured_sections

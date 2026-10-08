import re
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models.skill import Skill, SkillAlias
from app.ai.skill_extractor import escape_regex_term

# Section heading patterns for Job Descriptions
REQUIRED_SECTION_PATTERNS = re.compile(
    r"^(?:requirements|required\s+qualifications|what\s+you(?:'ll|\s+will)\s+bring|minimum\s+qualifications|must\s+have|basic\s+qualifications|what\s+we(?:'re|\s+are)\s+looking\s+for|qualifications)\b",
    re.IGNORECASE
)

PREFERRED_SECTION_PATTERNS = re.compile(
    r"^(?:preferred\s+qualifications|bonus\s+points|nice\s+to\s+have|preferred\s+skills|what\s+gives\s+you\s+an\s+edge|desirable\s+skills|bonus|plus)\b",
    re.IGNORECASE
)

SENIORITY_PATTERNS = {
    "Lead": re.compile(r"\b(?:lead|staff|principal|director|head\s+of)\b", re.IGNORECASE),
    "Senior": re.compile(r"\b(?:senior|sr\.?|iii|iv)\b", re.IGNORECASE),
    "Mid": re.compile(r"\b(?:mid|intermediate|ii)\b", re.IGNORECASE),
    "Entry": re.compile(r"\b(?:junior|jr\.?|associate|entry\s+level|intern|graduate)\b", re.IGNORECASE)
}

def detect_seniority_level(title: str, text: str) -> str:
    # 1. Prioritize explicit seniority in job title
    for level, pattern in SENIORITY_PATTERNS.items():
        if pattern.search(title):
            return level
            
    # 2. Fall back to body text intro
    for level, pattern in SENIORITY_PATTERNS.items():
        if pattern.search(text[:300]):
            return level
            
    return "Mid"  # Default assumption


def segment_job_description(raw_text: str) -> Dict[str, List[str]]:
    """
    Splits job description text into required vs preferred vs general blocks.
    """
    lines = raw_text.split("\n")
    segments = {
        "required": [],
        "preferred": [],
        "general": []
    }
    
    current_segment = "general"
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        clean_heading = re.sub(r"[:\-_]+$", "", stripped).strip()
        if len(clean_heading) < 50:
            if REQUIRED_SECTION_PATTERNS.match(clean_heading):
                current_segment = "required"
                continue
            elif PREFERRED_SECTION_PATTERNS.match(clean_heading):
                current_segment = "preferred"
                continue
                
        segments[current_segment].append(stripped)
        
    return segments

def analyze_job_requirements(
    job_text: str,
    job_title: str,
    db: Session
) -> Dict[str, Any]:
    """
    Analyzes job description:
    1. Determines seniority
    2. Identifies required vs preferred skills
    3. Normalizes against canonical taxonomy
    4. Attaches original context snippets
    """
    seniority = detect_seniority_level(job_title, job_text)
    segments = segment_job_description(job_text)
    
    skills = db.query(Skill).all()
    job_skills_found = {}  # skill_id -> dict

    def scan_segment(segment_lines: List[str], importance: str, weight: float):
        for skill in skills:
            terms = [skill.canonical_name] + [a.alias_name for a in skill.aliases]
            terms = sorted(list(set(terms)), key=len, reverse=True)
            
            matched_this_skill = False
            for term in terms:
                escaped = escape_regex_term(term)
                pattern = re.compile(rf"(?<![a-zA-Z0-9+#]){escaped}(?![a-zA-Z0-9+#])", re.IGNORECASE)
                
                for line in segment_lines:
                    if pattern.search(line):
                        if skill.id not in job_skills_found:
                            job_skills_found[skill.id] = {
                                "skill_id": skill.id,
                                "canonical_name": skill.canonical_name,
                                "category": skill.category,
                                "importance": importance,
                                "weight": weight,
                                "context_snippet": line
                            }
                        else:
                            if importance == "REQUIRED":
                                job_skills_found[skill.id]["importance"] = "REQUIRED"
                                job_skills_found[skill.id]["weight"] = 1.0
                                job_skills_found[skill.id]["context_snippet"] = line
                        matched_this_skill = True
                        break
                if matched_this_skill:
                    break

                        
    # 1. Scan required segment with weight 1.0
    scan_segment(segments["required"], importance="REQUIRED", weight=1.0)
    
    # 2. Scan preferred segment with weight 0.5
    scan_segment(segments["preferred"], importance="PREFERRED", weight=0.5)
    
    # 3. If no required section was explicitly labeled, scan general lines as REQUIRED
    if not segments["required"]:
        scan_segment(segments["general"], importance="REQUIRED", weight=1.0)
    else:
        # Any remaining skills in general text are considered PREFERRED
        scan_segment(segments["general"], importance="PREFERRED", weight=0.5)

    return {
        "seniority_level": seniority,
        "required_skills": [s for s in job_skills_found.values() if s["importance"] == "REQUIRED"],
        "preferred_skills": [s for s in job_skills_found.values() if s["importance"] == "PREFERRED"],
        "total_skills_count": len(job_skills_found),
        "all_skills": list(job_skills_found.values())
    }

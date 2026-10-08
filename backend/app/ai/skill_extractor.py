import re
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models.skill import Skill, SkillAlias

ACTION_VERBS = {
    "developed", "architected", "engineered", "built", "implemented", "designed",
    "deployed", "optimized", "migrated", "automated", "created", "led", "managed",
    "scaled", "reduced", "increased", "integrated", "spearheaded", "configured"
}

def escape_regex_term(term: str) -> str:
    """Escapes special regex characters in skill terms like C++, C#, .NET, Node.js."""
    return re.escape(term)

def extract_skills_from_text(
    text: str,
    db: Session,
    section_context: str = "general"
) -> List[Dict[str, Any]]:
    """
    Extracts canonical skills from a block of text using database taxonomy aliases.
    Preserves evidence context (sentence / bullet snippet).
    """
    if not text:
        return []
        
    # Split text into individual sentences or bullet lines for evidence tracing
    raw_lines = [line.strip() for line in re.split(r"[\n•\-\*]+|\.\s+", text) if len(line.strip()) > 3]
    
    # Load all canonical skills and aliases from DB
    skills = db.query(Skill).all()
    
    extracted_skills_map = {}  # canonical_name -> dict

    for skill in skills:
        # Build search patterns for this skill (canonical name + aliases)
        terms = [skill.canonical_name] + [a.alias_name for a in skill.aliases]
        # Sort terms by length descending to match multi-word phrases first
        terms = sorted(list(set(terms)), key=len, reverse=True)
        
        found = False
        evidence_snippets = []
        has_action_verb = False
        
        for term in terms:
            escaped = escape_regex_term(term)
            pattern = re.compile(rf"(?<![a-zA-Z0-9+#]){escaped}(?![a-zA-Z0-9+#])", re.IGNORECASE)

            
            for line in raw_lines:
                if pattern.search(line):
                    found = True
                    if line not in evidence_snippets:
                        evidence_snippets.append(line)
                        # Check if line contains action verbs or numbers for evidence rating
                        words = set(re.findall(r"\b[a-zA-Z]+\b", line.lower()))
                        if words.intersection(ACTION_VERBS):
                            has_action_verb = True

        if found:
            # Determine evidence quality
            if section_context in ["experience", "projects"] and has_action_verb:
                evidence_level = "STRONG"
            elif section_context in ["experience", "projects"]:
                evidence_level = "MODERATE"
            elif section_context == "skills":
                evidence_level = "LISTED"
            else:
                evidence_level = "MENTIONED"

            extracted_skills_map[skill.canonical_name] = {
                "skill_id": skill.id,
                "canonical_name": skill.canonical_name,
                "category": skill.category,
                "section": section_context,
                "evidence_level": evidence_level,
                "evidence_snippets": evidence_snippets[:3],  # Up to top 3 evidence lines
                "mention_count": len(evidence_snippets)
            }

    return list(extracted_skills_map.values())

def extract_resume_skill_profile(
    structured_sections: Dict[str, Any],
    db: Session
) -> List[Dict[str, Any]]:
    """
    Multi-pass extraction across all classified resume sections.
    Merges evidence from Experience, Projects, Skills, and Summary.
    """
    skill_registry = {}  # canonical_name -> skill_dict

    sections_to_scan = [
        ("skills", structured_sections.get("skills_text", "")),
        ("experience", structured_sections.get("experience_text", "")),
        ("projects", structured_sections.get("projects_text", "")),
        ("summary", structured_sections.get("summary", "")),
    ]

    for section_name, section_text in sections_to_scan:
        extracted = extract_skills_from_text(section_text, db, section_context=section_name)
        for item in extracted:
            name = item["canonical_name"]
            if name not in skill_registry:
                skill_registry[name] = item
                skill_registry[name]["sections_found"] = [section_name]
            else:
                # Merge evidence & upgrade evidence level if stronger in experience/projects
                existing = skill_registry[name]
                if section_name not in existing["sections_found"]:
                    existing["sections_found"].append(section_name)
                
                # Upgrade evidence level
                level_rank = {"LISTED": 1, "MENTIONED": 2, "MODERATE": 3, "STRONG": 4}
                if level_rank.get(item["evidence_level"], 0) > level_rank.get(existing["evidence_level"], 0):
                    existing["evidence_level"] = item["evidence_level"]
                    
                # Append unique snippets
                for snip in item["evidence_snippets"]:
                    if snip not in existing["evidence_snippets"]:
                        existing["evidence_snippets"].append(snip)
                        
                existing["mention_count"] += item["mention_count"]

    return list(skill_registry.values())

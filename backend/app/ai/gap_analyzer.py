from typing import Dict, List, Any

def analyze_skill_gaps(
    candidate_skills: List[Dict[str, Any]],
    job_skills: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Classifies candidate profile against job skills into 4 gap tiers:
    - STRONG_MATCH
    - PARTIAL_MATCH
    - WEAK_EVIDENCE
    - MISSING
    Assigns priority and explains the reasoning transparently.
    """
    candidate_skill_map = {s["canonical_name"].lower(): s for s in candidate_skills}
    gap_reports = []

    for js in job_skills:
        canonical_name = js["canonical_name"]
        canonical_lower = canonical_name.lower()
        importance = js.get("importance", "REQUIRED")
        context_snippet = js.get("context_snippet", f"Demonstrated expertise with {canonical_name}")

        if canonical_lower in candidate_skill_map:
            cand = candidate_skill_map[canonical_lower]
            evidence_level = cand.get("evidence_level", "LISTED")
            snippets = cand.get("evidence_snippets", [])
            evidence_text = snippets[0] if snippets else f"Listed under {', '.join(cand.get('sections_found', ['skills']))}"

            if evidence_level in ["STRONG", "MODERATE"]:
                gap_status = "STRONG_MATCH"
                priority = "LOW"
                reason = f"Well-evidenced in your work experience/projects: '{evidence_text}'."
            else:
                gap_status = "WEAK_EVIDENCE"
                priority = "HIGH" if importance == "REQUIRED" else "MEDIUM"
                reason = f"Listed in your resume, but lacks quantified achievements or project context showing how you applied {canonical_name} in production."

            gap_reports.append({
                "skill_id": js["skill_id"],
                "canonical_name": canonical_name,
                "category": js.get("category", "General"),
                "importance": importance,
                "gap_status": gap_status,
                "priority": priority,
                "resume_evidence": evidence_text,
                "job_requirement_snippet": context_snippet,
                "reason": reason
            })
        else:
            # Skill is completely missing
            gap_status = "MISSING"
            priority = "HIGH" if importance == "REQUIRED" else "MEDIUM"
            reason = f"This skill is {importance.lower()} for the role, but was not detected anywhere in your resume or profile."

            gap_reports.append({
                "skill_id": js["skill_id"],
                "canonical_name": canonical_name,
                "category": js.get("category", "General"),
                "importance": importance,
                "gap_status": gap_status,
                "priority": priority,
                "resume_evidence": "No evidence found",
                "job_requirement_snippet": context_snippet,
                "reason": reason
            })

    # Sort gaps: HIGH priority first, then MEDIUM, then LOW
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    gap_reports.sort(key=lambda x: (priority_order.get(x["priority"], 3), x["gap_status"] != "MISSING"))
    
    return gap_reports

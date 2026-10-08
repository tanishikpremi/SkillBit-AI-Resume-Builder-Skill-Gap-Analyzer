from typing import Dict, List, Any
from app.ai.embedding_service import embedding_service

EVIDENCE_MULTIPLIERS = {
    "STRONG": 1.0,     # In experience/projects with action verbs & metrics
    "MODERATE": 0.85,  # In experience/projects without action verbs
    "LISTED": 0.60,    # In skills block only
    "MENTIONED": 0.40  # In summary or header only
}

def calculate_match_metrics(
    candidate_skills: List[Dict[str, Any]],
    job_skills: List[Dict[str, Any]],
    candidate_bullets: List[str]
) -> Dict[str, Any]:
    """
    Transparent, explainable multi-factor scoring algorithm:
    1. Exact skill match score
    2. Experience evidence factor
    3. Semantic similarity against bullet snippets
    4. Required vs Preferred weighting
    """
    if not job_skills:
        return {
            "overall_score": 0.0,
            "exact_match_score": 0.0,
            "semantic_score": 0.0,
            "experience_score": 0.0,
            "matched_count": 0,
            "total_job_skills": 0,
            "disclaimer": "This score is an automated ATS alignment indicator and does not guarantee employment or interview selection."
        }

    candidate_skill_map = {s["canonical_name"].lower(): s for s in candidate_skills}

    total_weight = sum(js["weight"] for js in job_skills)
    accumulated_match_score = 0.0
    accumulated_exact_score = 0.0
    accumulated_experience_score = 0.0
    accumulated_semantic_score = 0.0
    matched_skills_count = 0

    for js in job_skills:
        canonical_lower = js["canonical_name"].lower()
        w = js["weight"]
        context_snippet = js.get("context_snippet", js["canonical_name"])

        if canonical_lower in candidate_skill_map:
            matched_skills_count += 1
            cand = candidate_skill_map[canonical_lower]
            evidence_level = cand.get("evidence_level", "LISTED")
            evidence_factor = EVIDENCE_MULTIPLIERS.get(evidence_level, 0.60)

            # 1. Exact match contribution
            accumulated_exact_score += 1.0 * w
            
            # 2. Experience evidence contribution
            accumulated_experience_score += evidence_factor * w

            # 3. Semantic similarity between job requirement snippet and candidate's actual bullet points
            candidate_snippets = cand.get("evidence_snippets", []) or candidate_bullets
            semantic_sim, _ = embedding_service.find_best_semantic_match(context_snippet, candidate_snippets)
            # Combine direct keyword with semantic resonance
            combined_factor = 0.6 * 1.0 + 0.4 * max(evidence_factor, semantic_sim)
            
            accumulated_match_score += combined_factor * w
            accumulated_semantic_score += max(0.5, semantic_sim) * w
        else:
            # Check if there is semantic overlap with related candidate experience even if keyword is missing
            semantic_sim, _ = embedding_service.find_best_semantic_match(context_snippet, candidate_bullets)
            if semantic_sim >= 0.70:
                # Partial semantic match
                accumulated_match_score += (0.45 * semantic_sim) * w
                accumulated_semantic_score += semantic_sim * w

    # Calculate percentages [0.0 - 100.0]
    overall_score = round((accumulated_match_score / total_weight) * 100, 1)
    exact_score = round((accumulated_exact_score / total_weight) * 100, 1)
    experience_score = round((accumulated_experience_score / total_weight) * 100, 1)
    semantic_score = round((accumulated_semantic_score / total_weight) * 100, 1)

    return {
        "overall_score": min(100.0, max(0.0, overall_score)),
        "exact_match_score": min(100.0, max(0.0, exact_score)),
        "semantic_score": min(100.0, max(0.0, semantic_score)),
        "experience_score": min(100.0, max(0.0, experience_score)),
        "matched_count": matched_skills_count,
        "total_job_skills": len(job_skills),
        "disclaimer": "This score is an automated ATS alignment indicator and does not guarantee employment or interview selection."
    }

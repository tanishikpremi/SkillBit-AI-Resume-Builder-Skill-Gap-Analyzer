from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple

from app.models.discovery import JobListing, UserJobPreferences, DEFAULT_SCORING_WEIGHTS
from app.ai.embedding_service import embedding_service


EVIDENCE_WEIGHTS = {
    "STRONG": 1.0,
    "MODERATE": 0.85,
    "LISTED": 0.65,
    "MENTIONED": 0.45,
}


def _normalize_weights(custom_weights: Optional[Dict[str, float]]) -> Dict[str, float]:
    weights = dict(DEFAULT_SCORING_WEIGHTS)
    if custom_weights and isinstance(custom_weights, dict):
        for k in weights:
            if k in custom_weights and isinstance(custom_weights[k], (int, float)) and custom_weights[k] >= 0:
                weights[k] = float(custom_weights[k])
    total = sum(weights.values())
    if total <= 0:
        return dict(DEFAULT_SCORING_WEIGHTS)
    return {k: v / total for k, v in weights.items()}


def select_best_resume_for_job(
    job: JobListing,
    unified_profile: Dict[str, Any],
) -> Tuple[Optional[str], Optional[str], str, List[Dict[str, Any]]]:
    """
    Compares all of the user's saved resumes against the job's required and preferred skills
    to identify which saved resume best supports the application.
    """
    resumes = unified_profile.get("resume_summaries") or []
    if not resumes:
        return None, None, "Add or upload a resume to compare resume-specific evidence.", []

    req_skills = [str(s).strip() for s in (job.required_skills or []) if str(s).strip()]
    pref_skills = [str(s).strip() for s in (job.preferred_skills or []) if str(s).strip()]
    req_lower = {s.lower(): s for s in req_skills}
    pref_lower = {s.lower(): s for s in pref_skills}

    comparisons: List[Dict[str, Any]] = []
    for r in resumes:
        r_skills_lower = {str(s).lower() for s in (r.get("skills") or [])}
        r_strong_lower = {str(s).lower() for s in (r.get("strong_skills") or [])}

        matched_req = [orig for low, orig in req_lower.items() if low in r_skills_lower]
        matched_pref = [orig for low, orig in pref_lower.items() if low in r_skills_lower]
        strong_hits = len(r_strong_lower.intersection(set(req_lower.keys()) | set(pref_lower.keys())))

        req_ratio = (len(matched_req) / len(req_lower)) if req_lower else 0.7
        pref_ratio = (len(matched_pref) / len(pref_lower)) if pref_lower else 0.5
        headline_sim = embedding_service.calculate_similarity(r.get("headline") or "", job.title or "")

        score = round(min(100.0, (0.60 * req_ratio + 0.20 * pref_ratio + 0.20 * headline_sim) * 100.0 + strong_hits * 3.0), 1)
        reason = (
            f"Matches {len(matched_req)}/{len(req_skills)} required skills "
            f"({', '.join(matched_req[:4]) if matched_req else 'general profile alignment'}) "
            f"with {strong_hits} experience-backed skill(s)."
        )
        comparisons.append({
            "resume_id": r["resume_id"],
            "resume_title": r["title"],
            "match_score": score,
            "matched_required_skills": matched_req,
            "matched_preferred_skills": matched_pref,
            "strong_evidence_count": strong_hits,
            "reason": reason,
        })

    comparisons.sort(key=lambda x: (x["match_score"], x["strong_evidence_count"]), reverse=True)
    best = comparisons[0]
    return best["resume_id"], best["resume_title"], best["reason"], comparisons


def evaluate_job_for_candidate(
    job: JobListing,
    unified_profile: Dict[str, Any],
    preferences: Optional[UserJobPreferences] = None,
) -> Dict[str, Any]:
    """
    Deterministic multi-factor job matching, mandatory eligibility verification,
    evidence mapping, and best-resume selection.
    """
    weights = _normalize_weights(preferences.scoring_weights if preferences else None)

    cand_skills_list = unified_profile.get("skills") or []
    cand_skill_map = {str(s.get("canonical_name") or "").lower(): s for s in cand_skills_list}
    cand_projects = unified_profile.get("projects") or []
    cand_experiences = unified_profile.get("experiences") or []
    cand_educations = unified_profile.get("educations") or []
    cand_years = float(unified_profile.get("total_experience_years") or 0.0)

    req_skills = [str(s).strip() for s in (job.required_skills or []) if str(s).strip()]
    pref_skills = [str(s).strip() for s in (job.preferred_skills or []) if str(s).strip()]

    # ------------------------------------------------------------------
    # 1. Skill Compatibility (25%)
    # ------------------------------------------------------------------
    strong_matching: List[str] = []
    partial_matching: List[str] = []
    missing_skills: List[str] = []

    all_cand_text_snippets: List[str] = []
    for exp in cand_experiences:
        all_cand_text_snippets.extend(exp.get("bullets") or [])
    for proj in cand_projects:
        if proj.get("description"):
            all_cand_text_snippets.append(proj["description"])
        all_cand_text_snippets.extend(proj.get("bullets") or [])

    total_skill_weight = 0.0
    earned_skill_weight = 0.0

    for sk in req_skills:
        w = 1.0
        total_skill_weight += w
        low = sk.lower()
        if low in cand_skill_map:
            ev = cand_skill_map[low].get("evidence_level", "LISTED")
            mult = EVIDENCE_WEIGHTS.get(ev, 0.65)
            if ev in ("STRONG", "MODERATE"):
                strong_matching.append(sk)
                earned_skill_weight += 1.0 * w
            else:
                partial_matching.append(sk)
                earned_skill_weight += mult * w
        else:
            sim, _ = embedding_service.find_best_semantic_match(sk, all_cand_text_snippets)
            if sim >= 0.65:
                partial_matching.append(sk)
                earned_skill_weight += 0.55 * w
            else:
                missing_skills.append(sk)

    for sk in pref_skills:
        w = 0.5
        total_skill_weight += w
        low = sk.lower()
        if low in cand_skill_map:
            ev = cand_skill_map[low].get("evidence_level", "LISTED")
            if ev in ("STRONG", "MODERATE") and sk not in strong_matching:
                strong_matching.append(sk)
            elif sk not in partial_matching and sk not in strong_matching:
                partial_matching.append(sk)
            earned_skill_weight += 0.95 * w
        else:
            sim, _ = embedding_service.find_best_semantic_match(sk, all_cand_text_snippets)
            if sim >= 0.65:
                if sk not in partial_matching:
                    partial_matching.append(sk)
                earned_skill_weight += 0.5 * w

    if total_skill_weight > 0:
        skill_compat_score = min(100.0, round((earned_skill_weight / total_skill_weight) * 100.0, 1))
    else:
        # Fallback to semantic similarity between job description and candidate skills
        cand_skill_blob = " ".join(cand_skill_map.keys())
        skill_compat_score = round(embedding_service.calculate_similarity(job.description or job.title, cand_skill_blob) * 100.0, 1)

    # ------------------------------------------------------------------
    # 2. Experience & Project Relevance (20%)
    # ------------------------------------------------------------------
    relevant_projects: List[str] = []
    job_tech_set = {s.lower() for s in req_skills + pref_skills}
    best_proj_scores: List[float] = []

    for proj in cand_projects:
        ptitle = proj.get("title") or "Project"
        ptechs = {str(t).lower() for t in (proj.get("technologies") or [])}
        pdesc = f"{ptitle} {' '.join(proj.get('technologies') or [])} {proj.get('description') or ''} {' '.join(proj.get('bullets') or [])}"
        overlap = ptechs.intersection(job_tech_set)
        sem = embedding_service.calculate_similarity(job.description or job.title, pdesc)
        pscore = min(1.0, 0.55 * (len(overlap) / max(1, min(3, len(job_tech_set)))) + 0.45 * sem)
        if overlap or pscore >= 0.35:
            relevant_projects.append(f"{ptitle} ({', '.join(proj.get('technologies') or [])[:60]})" if proj.get("technologies") else ptitle)
            best_proj_scores.append(pscore)

    exp_blob = " ".join(all_cand_text_snippets)
    exp_sem = embedding_service.calculate_similarity(job.description or job.title, exp_blob) if exp_blob else 0.0
    proj_factor = max(best_proj_scores) if best_proj_scores else 0.3
    exp_proj_score = round(min(100.0, (0.55 * proj_factor + 0.45 * max(exp_sem, len(strong_matching) * 0.2)) * 100.0), 1)

    # ------------------------------------------------------------------
    # 3. Role Alignment (15%)
    # ------------------------------------------------------------------
    pref_roles = [r.lower() for r in ((preferences.preferred_roles if preferences else None) or []) if r]
    alt_roles = [r.lower() for r in ((preferences.alternative_roles if preferences else None) or []) if r]
    inferred_roles = [r.lower() for r in (unified_profile.get("inferred_roles") or [])]
    adjacent_roles = [r.lower() for r in (unified_profile.get("adjacent_roles") or [])]

    target_role_pool = pref_roles + alt_roles
    if not (preferences and preferences.override_inferred_roles and pref_roles):
        target_role_pool.extend(inferred_roles + adjacent_roles)

    job_title_lower = (job.title or "").lower()
    role_sims = [embedding_service.calculate_similarity(job_title_lower, r) for r in target_role_pool] if target_role_pool else [0.6]
    direct_title_overlap = any(
        w in job_title_lower
        for r in target_role_pool
        for w in r.split()
        if len(w) > 3 and w not in ("junior", "senior", "intern", "engineer", "developer")
    )
    role_alignment_score = round(min(100.0, (max(role_sims) * 75.0) + (25.0 if direct_title_overlap else 10.0)), 1)

    # Check if job falls in user's excluded categories
    excluded_cats = [c.lower() for c in ((preferences.excluded_categories if preferences else None) or []) if c]
    if any(ec in job_title_lower or ec in (job.industry or "").lower() for ec in excluded_cats):
        role_alignment_score = max(0.0, role_alignment_score - 60.0)

    # ------------------------------------------------------------------
    # 4. Education & Experience Eligibility (15%) + Mandatory Hard Filter
    # ------------------------------------------------------------------
    eligibility_reasons: List[str] = []
    unmet_mandatory = False
    unknown_factors = False

    min_req_years = float(job.min_experience_years or 0.0)
    years_gap = min_req_years - cand_years

    if min_req_years >= 5.0 and cand_years < 2.0:
        unmet_mandatory = True
        exp_compat_text = (
            f"Mandatory experience gap: Role requires {min_req_years:.0f}+ years ({job.seniority_level} level), "
            f"while your profile reflects ~{cand_years:.1f} years."
        )
        eligibility_reasons.append(exp_compat_text)
        edu_elig_score = 25.0
    elif years_gap > 2.0:
        exp_compat_text = (
            f"Stretch experience requirement: Role asks for {min_req_years:.0f}+ years; "
            f"your profile shows {cand_years:.1f} years plus {len(cand_projects)} project(s)."
        )
        eligibility_reasons.append(exp_compat_text)
        edu_elig_score = 60.0
    else:
        exp_compat_text = (
            f"Compatible experience level: Your profile ({cand_years:.1f} yrs, {unified_profile.get('career_stage')}) "
            f"aligns with {job.experience_requirements or 'this role'}."
        )
        eligibility_reasons.append(exp_compat_text)
        edu_elig_score = 92.0

    if cand_educations:
        top_edu = cand_educations[0]
        edu_compat_text = (
            f"Meets academic background with {top_edu.get('degree') or 'Degree'} "
            f"from {top_edu.get('institution') or 'University'}."
        )
        edu_elig_score = min(100.0, edu_elig_score + 8.0)
    else:
        unknown_factors = True
        edu_compat_text = "No formal education entry saved yet; eligibility evaluated via technical skills and projects."

    # ------------------------------------------------------------------
    # 5. Location & Work Arrangement Preference (10%)
    # ------------------------------------------------------------------
    remote_only = bool(preferences.remote_only) if preferences else False
    pref_locs = [l.lower() for l in ((preferences.preferred_locations if preferences else None) or []) if l]
    cand_loc = (unified_profile.get("location") or "").lower()

    job_loc_lower = (job.location or "").lower()
    job_arr = (job.work_arrangement or "Remote").lower()

    if remote_only and job_arr == "on-site" and "remote" not in job_loc_lower:
        unmet_mandatory = True
        loc_score = 15.0
        eligibility_reasons.append(f"Role is strictly On-site ({job.location}), conflicting with your Remote-only preference.")
    elif job_arr == "remote" or "remote" in job_loc_lower:
        loc_score = 100.0
    elif any(pl in job_loc_lower for pl in pref_locs) or (cand_loc and cand_loc in job_loc_lower):
        loc_score = 95.0
    elif job_arr == "hybrid":
        loc_score = 75.0
    else:
        loc_score = 60.0

    # ------------------------------------------------------------------
    # 6. Job Freshness & Availability (10%)
    # ------------------------------------------------------------------
    avail = job.availability_status or "Active"
    if avail == "Closed":
        unmet_mandatory = True
        freshness_score = 0.0
        eligibility_reasons.append("Job listing is marked as Closed.")
    elif avail == "Recently Published":
        freshness_score = 100.0
    elif avail == "Active":
        freshness_score = 92.0
    elif avail == "Closing Soon":
        freshness_score = 85.0
    elif avail == "Unable to Verify":
        freshness_score = 65.0
    else:  # Possibly Expired
        freshness_score = 35.0

    # ------------------------------------------------------------------
    # 7. Other User Preferences (5%)
    # ------------------------------------------------------------------
    other_score = 85.0
    if preferences:
        if preferences.internship_preference == "internship_only" and not job.is_internship:
            other_score = 30.0
        elif preferences.internship_preference == "fulltime_only" and job.is_internship:
            other_score = 30.0

        if preferences.salary_min and job.salary_max and job.salary_max < preferences.salary_min:
            other_score = max(20.0, other_score - 40.0)

        excluded_comps = {c.strip().lower() for c in (preferences.excluded_companies or []) if c}
        if (job.company or "").strip().lower() in excluded_comps:
            unmet_mandatory = True
            other_score = 0.0
            eligibility_reasons.append(f"Company '{job.company}' is in your excluded companies list.")

    # ------------------------------------------------------------------
    # Compute Weighted Overall Score & Apply Mandatory Eligibility Cap
    # ------------------------------------------------------------------
    raw_weighted = (
        weights["skill_compatibility"] * skill_compat_score
        + weights["experience_project_relevance"] * exp_proj_score
        + weights["role_alignment"] * role_alignment_score
        + weights["education_eligibility"] * edu_elig_score
        + weights["location_work_preference"] * loc_score
        + weights["job_freshness_availability"] * freshness_score
        + weights["other_preferences"] * other_score
    )
    overall_score = round(min(100.0, max(0.0, raw_weighted)), 1)

    if unmet_mandatory:
        eligibility_status = "Not eligible based on available information"
        # Hard cap: never allow high keyword similarity to override an unmet mandatory requirement
        overall_score = min(overall_score, 42.0)
    elif len(missing_skills) == 0 and skill_compat_score >= 70.0 and not unknown_factors:
        eligibility_status = "Confirmed eligibility"
    elif skill_compat_score >= 40.0 or len(strong_matching) + len(partial_matching) >= 1:
        eligibility_status = "Likely eligibility" if not unknown_factors else "Unknown eligibility"
    else:
        eligibility_status = "Unknown eligibility"

    # ------------------------------------------------------------------
    # Select Best Resume & Build Actionable Explanations
    # ------------------------------------------------------------------
    best_res_id, best_res_title, best_res_reason, res_comparison = select_best_resume_for_job(job, unified_profile)

    matched_preview = ", ".join((strong_matching + partial_matching)[:4]) or "transferable engineering foundations"
    why_recommended = (
        f"Recommended for your {unified_profile.get('career_stage', 'professional')} profile because your verified experience in "
        f"{matched_preview} aligns with {job.company}'s {job.title} requirements"
        + (f", supported by your project work ({relevant_projects[0]})." if relevant_projects else ".")
    )

    concerns: List[str] = []
    if missing_skills:
        concerns.append(
            f"Not yet evidenced on your saved resumes: {', '.join(missing_skills[:4])}. "
            "(If you already possess these skills, add them to your Master Profile or resume bullets.)"
        )
    if partial_matching:
        concerns.append(
            f"Skills listed without quantified project/work bullets: {', '.join(partial_matching[:3])}."
        )
    if years_gap > 1.0:
        concerns.append(exp_compat_text)
    if avail in ("Possibly Expired", "Unable to Verify"):
        concerns.append(f"Listing verification status is '{avail}'; confirm active opening on {job.company}'s application page.")

    prep_steps: List[str] = []
    if missing_skills:
        prep_steps.append(
            f"Review the SkillBit 4-Stage Learning Roadmap for {missing_skills[0]} and build a focused proof-of-concept."
        )
    if partial_matching:
        prep_steps.append(
            f"Use the Resume Builder STAR Optimizer to add measurable impact bullets for {', '.join(partial_matching[:2])}."
        )
    if best_res_title:
        prep_steps.append(
            f"Apply using your '{best_res_title}' resume, which has the strongest evidence match for this role."
        )
    else:
        prep_steps.append(
            f"Tailor a dedicated single-column ATS resume highlighting {matched_preview} before applying."
        )

    # Category tags for Job Discovery Dashboard tabs
    category_tags: List[str] = ["recommended"]
    if overall_score >= 72.0 and eligibility_status != "Not eligible based on available information":
        category_tags.append("best_match")
    if job.is_internship:
        category_tags.append("internship")
    if job.is_fresher_friendly:
        category_tags.append("fresher_friendly")
    if (job.work_arrangement or "").lower() == "remote":
        category_tags.append("remote")
    if job.is_startup:
        category_tags.append("startup")
    if avail in ("Recently Published", "Active"):
        category_tags.append("latest")

    return {
        "match_score": overall_score,
        "score_breakdown": {
            "skill_compatibility": skill_compat_score,
            "experience_project_relevance": exp_proj_score,
            "role_alignment": role_alignment_score,
            "education_eligibility": edu_elig_score,
            "location_work_preference": loc_score,
            "job_freshness_availability": freshness_score,
            "other_preferences": other_score,
        },
        "eligibility_status": eligibility_status,
        "eligibility_reasons": eligibility_reasons,
        "strong_matching_skills": strong_matching,
        "partially_matching_skills": partial_matching,
        "missing_skills": missing_skills,
        "relevant_projects": relevant_projects,
        "education_compatibility": edu_compat_text,
        "experience_compatibility": exp_compat_text,
        "why_recommended": why_recommended,
        "potential_concerns": concerns,
        "preparation_steps": prep_steps,
        "best_resume_id": best_res_id,
        "best_resume_title": best_res_title,
        "best_resume_reason": best_res_reason,
        "resume_comparison": res_comparison,
        "category_tags": category_tags,
    }

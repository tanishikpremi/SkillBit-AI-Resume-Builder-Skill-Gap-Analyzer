import re
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.profile import Profile
from app.models.resume import Resume
from app.models.skill import Skill
from app.models.discovery import CandidateProfileSnapshot, UserJobPreferences
from app.ai.section_classifier import (
    classify_resume_sections,
    extract_structured_profile_from_sections,
)
from app.ai.skill_extractor import extract_resume_skill_profile
from app.ai.skill_normalizer import normalize_single_skill


AI_PLACEHOLDER_PATTERN = re.compile(r"\[(?:metric|x|number|%|result|impact|company|degree)[^\]]*\]", re.IGNORECASE)

EVIDENCE_RANK = {
    "STRONG": 4,
    "MODERATE": 3,
    "LISTED": 2,
    "MENTIONED": 1,
}

ADJACENT_ROLE_RULES: List[Dict[str, Any]] = [
    {
        "role": "Junior Python Developer",
        "required_any": {"python"},
        "bonus_any": {"fastapi", "django", "flask", "sql", "postgresql", "git"},
        "domain": "Backend & Software Engineering",
        "entry_friendly": True,
    },
    {
        "role": "Backend Software Engineer",
        "required_any": {"python", "java", "go", "node.js", "c#", "rust"},
        "bonus_any": {"postgresql", "docker", "redis", "microservices", "fastapi", "spring boot"},
        "domain": "Backend & Software Engineering",
        "entry_friendly": False,
    },
    {
        "role": "Frontend Developer Intern",
        "required_any": {"react", "javascript", "typescript", "vue.js", "html", "css"},
        "bonus_any": {"tailwind css", "next.js", "figma", "redux"},
        "domain": "Frontend & Web Development",
        "entry_friendly": True,
    },
    {
        "role": "Full-Stack Software Engineer",
        "required_any": {"react", "next.js", "vue.js", "typescript"},
        "must_also_have_any": {"node.js", "python", "fastapi", "postgresql", "mongodb", "express.js", "django"},
        "bonus_any": {"docker", "aws", "graphql", "redis"},
        "domain": "Full-Stack Engineering",
        "entry_friendly": False,
    },
    {
        "role": "Data Analyst Intern",
        "required_any": {"sql", "python", "pandas", "tableau", "power bi", "data analysis"},
        "bonus_any": {"numpy", "postgresql", "excel", "statistics", "etl"},
        "domain": "Data & Analytics",
        "entry_friendly": True,
    },
    {
        "role": "Junior Business Analyst",
        "required_any": {"sql", "tableau", "power bi", "pandas", "data analysis"},
        "bonus_any": {"agile", "problem solving", "jira", "python"},
        "domain": "Data & Business Intelligence",
        "entry_friendly": True,
    },
    {
        "role": "UI/UX Designer",
        "required_any": {"figma", "ui/ux", "user research", "wireframing"},
        "bonus_any": {"html", "css", "react", "tailwind css"},
        "domain": "Design & Product",
        "entry_friendly": True,
    },
    {
        "role": "Product Design Intern",
        "required_any": {"figma", "ui/ux"},
        "bonus_any": {"html", "css", "javascript", "react"},
        "domain": "Design & Product",
        "entry_friendly": True,
    },
    {
        "role": "AI / Machine Learning Engineer",
        "required_any": {"machine learning", "deep learning", "pytorch", "tensorflow", "nlp", "llms", "scikit-learn"},
        "bonus_any": {"python", "rag", "docker", "fastapi", "pandas"},
        "domain": "AI & Machine Learning",
        "entry_friendly": False,
    },
    {
        "role": "Research Assistant",
        "required_any": {"python", "machine learning", "nlp", "pytorch", "tensorflow", "scikit-learn", "pandas"},
        "bonus_any": {"c++", "sql", "deep learning", "computer vision"},
        "domain": "Research & Academic",
        "entry_friendly": True,
    },
    {
        "role": "DevOps / Cloud Engineer",
        "required_any": {"docker", "kubernetes", "aws", "terraform", "ci/cd", "linux"},
        "bonus_any": {"github actions", "python", "bash", "google cloud platform", "microsoft azure"},
        "domain": "Cloud & DevOps",
        "entry_friendly": False,
    },
    {
        "role": "Software Development Trainee",
        "required_any": {"python", "javascript", "java", "c++", "typescript", "sql"},
        "bonus_any": {"git", "github", "react", "html", "css"},
        "domain": "Graduate & Trainee Programs",
        "entry_friendly": True,
    },
    {
        "role": "Technical Support Engineer",
        "required_any": {"sql", "python", "linux", "javascript", "restful apis"},
        "bonus_any": {"docker", "aws", "git", "problem solving"},
        "domain": "Technical Operations & Support",
        "entry_friendly": True,
    },
]


def _is_ai_placeholder_text(text: str) -> bool:
    if not text:
        return False
    return bool(AI_PLACEHOLDER_PATTERN.search(text))


def _clean_verified_bullets(bullets: List[Any]) -> List[str]:
    """Filters out unverified AI placeholder bullets so AI suggestions are never treated as confirmed facts."""
    verified = []
    for b in bullets or []:
        s = str(b).strip()
        if s and not _is_ai_placeholder_text(s):
            verified.append(s)
    return verified


def _extract_year(date_str: Optional[str]) -> Optional[int]:
    if not date_str:
        return None
    matches = re.findall(r"\b(19\d{2}|20\d{2})\b", str(date_str))
    if matches:
        return int(matches[-1])
    return None


def _estimate_experience_years(experiences: List[Dict[str, Any]]) -> Tuple[float, bool]:
    """
    Returns (estimated_fulltime_years, has_internship_experience).
    """
    total_years = 0.0
    has_internship = False
    current_year = datetime.now(timezone.utc).year

    for exp in experiences:
        role = (exp.get("role_title") or "").lower()
        is_intern = any(k in role for k in ("intern", "trainee", "apprentice", "student", "fellow"))
        if is_intern:
            has_internship = True

        start_yr = _extract_year(exp.get("start_date"))
        end_raw = str(exp.get("end_date") or "").lower()
        if exp.get("is_current") or any(k in end_raw for k in ("present", "current", "now")):
            end_yr = current_year
        else:
            end_yr = _extract_year(exp.get("end_date")) or start_yr

        if start_yr and end_yr and end_yr >= start_yr:
            span = max(0.5, float(end_yr - start_yr))
        else:
            span = 0.5 if is_intern else 1.0

        if not is_intern:
            total_years += span
        else:
            total_years += min(0.5, span * 0.5)

    return round(min(total_years, 25.0), 1), has_internship


def _infer_career_stage(
    total_years: float,
    has_internship: bool,
    graduation_year: Optional[int],
    experiences_count: int,
) -> str:
    current_year = datetime.now(timezone.utc).year
    if graduation_year and graduation_year > current_year:
        return "Student / Internship Seeker"
    if total_years < 0.5 and experiences_count == 0:
        return "Fresher / Entry-Level"
    if total_years <= 1.0:
        return "Fresher / Entry-Level" if not has_internship else "Early Career / Junior (0-1 yrs)"
    if total_years <= 2.5:
        return "Junior (1-2 yrs)"
    if total_years <= 5.0:
        return "Mid-Level (2-5 yrs)"
    return "Senior (5+ yrs)"


def infer_candidate_roles(
    skills_map: Dict[str, Dict[str, Any]],
    projects: List[Dict[str, Any]],
    experiences: List[Dict[str, Any]],
    headline: Optional[str],
    total_years: float,
    preferences: Optional[UserJobPreferences] = None,
) -> Dict[str, Any]:
    """
    Computes primary target roles and adjacent/transferable career opportunities.
    Respects user role overrides so a candidate with a secondary skill (e.g. a designer who knows basic Python)
    is not flooded with unrelated recommendations when they have explicit preferences.
    """
    skill_Set = {k.lower() for k in skills_map.keys()}
    strong_skill_set = {
        k.lower()
        for k, v in skills_map.items()
        if v.get("evidence_level") in ("STRONG", "MODERATE") or v.get("proficiency") in ("Advanced", "Expert")
    }

    # Check project text for UI/UX or data analysis signals
    proj_blob = " ".join(
        f"{p.get('title', '')} {p.get('description', '')} {' '.join(p.get('technologies') or [])}"
        for p in projects
    ).lower()
    if "figma" in proj_blob or "ui/ux" in proj_blob or "wireframe" in proj_blob or "design" in proj_blob:
        skill_Set.add("ui/ux")
    if "pandas" in skill_Set or "tableau" in skill_Set or "analytics" in proj_blob or "data analysis" in proj_blob:
        skill_Set.add("data analysis")

    preferred_roles = [r.strip() for r in ((preferences.preferred_roles if preferences else None) or []) if str(r).strip()]
    alternative_roles = [r.strip() for r in ((preferences.alternative_roles if preferences else None) or []) if str(r).strip()]
    excluded_cats = {c.strip().lower() for c in ((preferences.excluded_categories if preferences else None) or []) if str(c).strip()}
    override_inferred = bool(preferences and preferences.override_inferred_roles and preferred_roles)

    # Identify candidate's dominant domain from headline + strong skills
    headline_clean = (headline or "").strip()
    is_design_dominant = any(w in headline_clean.lower() for w in ("designer", "ui/ux", "product design", "ux")) or (
        any(w in strong_skill_set for w in ("figma", "ui/ux")) and "python" not in strong_skill_set
    )

    inferred_roles: List[Dict[str, Any]] = []
    for rule in ADJACENT_ROLE_RULES:
        if rule["domain"].lower() in excluded_cats:
            continue
        req_any = rule["required_any"]
        matched_req = skill_Set.intersection(req_any)
        if not matched_req:
            continue

        must_also = rule.get("must_also_have_any")
        if must_also and not skill_Set.intersection(must_also):
            continue

        # Guardrail: Do not flood a Design-dominant candidate with pure Backend roles just because they listed basic Python
        if is_design_dominant and "Backend" in rule["domain"] and not matched_req.intersection(strong_skill_set):
            continue

        bonus_matched = skill_Set.intersection(rule.get("bonus_any", set()))
        strong_overlap = matched_req.intersection(strong_skill_set)

        confidence = 0.55 + 0.12 * len(matched_req) + 0.08 * len(bonus_matched) + 0.10 * len(strong_overlap)
        if total_years <= 1.0 and rule.get("entry_friendly"):
            confidence += 0.10
        elif total_years >= 2.0 and not rule.get("entry_friendly"):
            confidence += 0.10

        inferred_roles.append({
            "role": rule["role"],
            "domain": rule["domain"],
            "confidence": round(min(confidence, 0.98), 2),
            "supporting_skills": sorted(list(matched_req | bonus_matched)),
            "entry_friendly": rule.get("entry_friendly", False),
        })

    inferred_roles.sort(key=lambda x: x["confidence"], reverse=True)

    primary_roles: List[str] = []
    if preferred_roles:
        primary_roles.extend(preferred_roles)
    if not override_inferred:
        if headline_clean and headline_clean not in primary_roles and len(headline_clean) < 65:
            primary_roles.append(headline_clean)
        for ir in inferred_roles[:4]:
            if ir["role"] not in primary_roles:
                primary_roles.append(ir["role"])

    adjacent_roles: List[str] = list(alternative_roles)
    if not override_inferred:
        for ir in inferred_roles:
            if ir["role"] not in primary_roles and ir["role"] not in adjacent_roles:
                adjacent_roles.append(ir["role"])

    if not primary_roles:
        primary_roles = ["Software Engineer", "Software Developer Intern"]

    return {
        "primary_roles": primary_roles[:5],
        "adjacent_roles": adjacent_roles[:6],
        "role_evaluations": inferred_roles[:8],
    }


def build_candidate_profile_snapshot(
    user: User,
    db: Session,
    force_rebuild: bool = False,
) -> CandidateProfileSnapshot:
    """
    Aggregates the user's Master Profile and ALL saved Resumes into a unified,
    deduplicated, provenance-tracked CandidateProfileSnapshot.
    Detects and records cross-resume contradictions instead of silently ignoring them.
    """
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == user.id, Resume.is_active == True)
        .order_by(Resume.created_at.desc())
        .all()
    )
    preferences = (
        db.query(UserJobPreferences)
        .filter(UserJobPreferences.user_id == user.id)
        .first()
    )

    skills_registry: Dict[str, Dict[str, Any]] = {}
    experiences_registry: Dict[str, Dict[str, Any]] = {}
    projects_registry: Dict[str, Dict[str, Any]] = {}
    educations_registry: Dict[str, Dict[str, Any]] = {}
    certifications_registry: Dict[str, Dict[str, Any]] = {}
    achievements_list: List[Dict[str, Any]] = []
    conflicts: List[Dict[str, Any]] = []
    source_attribution: Dict[str, List[str]] = {
        "skills": [],
        "experiences": [],
        "projects": [],
        "educations": [],
        "certifications": [],
    }
    resume_summaries: List[Dict[str, Any]] = []

    def _register_source(bucket: str, src: str):
        if src not in source_attribution[bucket]:
            source_attribution[bucket].append(src)

    # ------------------------------------------------------------------
    # 1. Ingest Verified Master Profile First (Highest Authority)
    # ------------------------------------------------------------------
    headline = profile.headline if profile and profile.headline else None
    summary = profile.summary if profile and profile.summary else None
    location = profile.location if profile and profile.location else None

    if profile:
        # Master Profile Skills
        for us in profile.user_skills or []:
            sk = db.query(Skill).filter(Skill.id == us.skill_id).first()
            if not sk:
                continue
            cname = sk.canonical_name
            key = cname.lower()
            ev_level = "STRONG" if us.proficiency in ("Advanced", "Expert") else "MODERATE"
            skills_registry[key] = {
                "skill_id": sk.id,
                "canonical_name": cname,
                "category": sk.category,
                "proficiency": us.proficiency or "Intermediate",
                "years_experience": us.years_experience,
                "evidence_level": ev_level,
                "evidence_snippets": [],
                "verified_by_master_profile": True,
                "verified_by_resume": bool(us.verified_by_resume),
                "sources": ["master_profile"],
            }
            _register_source("skills", "master_profile")

        # Master Profile Experiences
        for exp in profile.experiences or []:
            comp = (exp.get("company") if isinstance(exp, dict) else exp.company) or ""
            role = (exp.get("role_title") if isinstance(exp, dict) else exp.role_title) or ""
            if not comp and not role:
                continue
            exp_key = f"{comp.strip().lower()}::{role.strip().lower()}"
            clean_bullets = _clean_verified_bullets(exp.bullets or [])
            experiences_registry[exp_key] = {
                "company": comp.strip(),
                "role_title": role.strip(),
                "location": exp.location,
                "start_date": exp.start_date,
                "end_date": exp.end_date,
                "is_current": bool(exp.is_current),
                "bullets": clean_bullets,
                "technologies": list(exp.technologies or []),
                "verified_by_master_profile": True,
                "sources": ["master_profile"],
            }
            _register_source("experiences", "master_profile")

        # Master Profile Projects
        for proj in profile.projects or []:
            ptitle = (proj.title or "").strip()
            if not ptitle:
                continue
            proj_key = re.sub(r"[^a-z0-9]+", "", ptitle.lower())
            projects_registry[proj_key] = {
                "title": ptitle,
                "description": proj.description or "",
                "role": proj.role,
                "technologies": list(proj.technologies or []),
                "repo_url": proj.repo_url,
                "live_url": proj.live_url,
                "bullets": [proj.description] if proj.description and not _is_ai_placeholder_text(proj.description) else [],
                "verified_by_master_profile": True,
                "sources": ["master_profile"],
            }
            _register_source("projects", "master_profile")

        # Master Profile Educations
        for edu in profile.educations or []:
            inst = (edu.institution or "").strip()
            deg = (edu.degree or "").strip()
            if not inst and not deg:
                continue
            edu_key = re.sub(r"[^a-z0-9]+", "", inst.lower()) or deg.lower()
            educations_registry[edu_key] = {
                "institution": inst,
                "degree": deg,
                "field_of_study": edu.field_of_study,
                "start_date": edu.start_date,
                "end_date": edu.end_date,
                "gpa": edu.gpa,
                "honors": edu.honors,
                "verified_by_master_profile": True,
                "sources": ["master_profile"],
            }
            _register_source("educations", "master_profile")

    # ------------------------------------------------------------------
    # 2. Ingest ALL Saved Resumes (Deduplicating & Flagging Contradictions)
    # ------------------------------------------------------------------
    seen_headlines: Dict[str, str] = {}
    if headline:
        seen_headlines["master_profile"] = headline

    seen_locations: Dict[str, str] = {}
    if location:
        seen_locations["master_profile"] = location

    for res in resumes:
        src_tag = f"resume:{res.id}:{res.title}"
        s_json = dict(res.structured_json or {})
        raw_text = res.raw_text or s_json.get("raw_text") or ""

        # Parse sections if structured fields are missing
        if raw_text and (not s_json.get("extracted_skills") or (not s_json.get("experiences") and not s_json.get("educations"))):
            sections = classify_resume_sections(raw_text)
            extracted = s_json.get("extracted_skills") or extract_resume_skill_profile(sections, db)
            gen = extract_structured_profile_from_sections(sections, extracted, fallback_title=res.title)
            s_json.setdefault("extracted_skills", extracted)
            s_json.setdefault("experiences", gen.get("experiences", []))
            s_json.setdefault("educations", gen.get("educations", []))
            s_json.setdefault("projects", gen.get("projects", []))
            s_json.setdefault("headline", gen.get("headline"))
            s_json.setdefault("summary", gen.get("summary"))

        res_headline = (s_json.get("designation") or s_json.get("headline") or "").strip()
        if res_headline:
            seen_headlines[src_tag] = res_headline
            if not headline:
                headline = res_headline

        res_contact = s_json.get("contact_info") or {}
        res_loc = (res_contact.get("location") or s_json.get("location") or "").strip()
        if res_loc:
            seen_locations[src_tag] = res_loc
            if not location:
                location = res_loc

        if not summary and s_json.get("summary"):
            summary = s_json.get("summary")

        # Track per-resume skill list for "Best Resume for this Job" comparison
        res_skill_names: List[str] = []
        res_strong_skills: List[str] = []

        # 2a. Extracted Skills from Resume
        for es in s_json.get("extracted_skills") or []:
            if not isinstance(es, dict):
                continue
            cname = (es.get("canonical_name") or es.get("name") or "").strip()
            if not cname:
                continue
            key = cname.lower()
            ev_level = es.get("evidence_level") or "LISTED"
            snippets = _clean_verified_bullets(es.get("evidence_snippets") or [])

            res_skill_names.append(cname)
            if ev_level in ("STRONG", "MODERATE"):
                res_strong_skills.append(cname)

            if key not in skills_registry:
                skills_registry[key] = {
                    "skill_id": es.get("skill_id") or key,
                    "canonical_name": cname,
                    "category": es.get("category") or "Technical",
                    "proficiency": "Advanced" if ev_level == "STRONG" else ("Intermediate" if ev_level == "MODERATE" else "Beginner"),
                    "years_experience": None,
                    "evidence_level": ev_level,
                    "evidence_snippets": snippets[:3],
                    "verified_by_master_profile": False,
                    "verified_by_resume": True,
                    "sources": [src_tag],
                }
            else:
                existing = skills_registry[key]
                existing["verified_by_resume"] = True
                if src_tag not in existing["sources"]:
                    existing["sources"].append(src_tag)
                if EVIDENCE_RANK.get(ev_level, 0) > EVIDENCE_RANK.get(existing.get("evidence_level", "LISTED"), 0):
                    existing["evidence_level"] = ev_level
                for snip in snippets:
                    if snip not in existing["evidence_snippets"] and len(existing["evidence_snippets"]) < 4:
                        existing["evidence_snippets"].append(snip)
            _register_source("skills", src_tag)

        # Also check flat skills list on resume if any weren't in extracted_skills
        for raw_sk in s_json.get("skills") or []:
            sk_str = raw_sk.get("canonical_name") if isinstance(raw_sk, dict) else str(raw_sk)
            if not sk_str or not sk_str.strip():
                continue
            norm_obj = normalize_single_skill(sk_str, db)
            cname = norm_obj.canonical_name if norm_obj else sk_str.strip()
            key = cname.lower()
            if cname not in res_skill_names:
                res_skill_names.append(cname)
            if key not in skills_registry:
                skills_registry[key] = {
                    "skill_id": norm_obj.id if norm_obj else key,
                    "canonical_name": cname,
                    "category": norm_obj.category if norm_obj else "Technical",
                    "proficiency": "Intermediate",
                    "years_experience": None,
                    "evidence_level": "LISTED",
                    "evidence_snippets": [],
                    "verified_by_master_profile": False,
                    "verified_by_resume": True,
                    "sources": [src_tag],
                }
            elif src_tag not in skills_registry[key]["sources"]:
                skills_registry[key]["sources"].append(src_tag)

        # 2b. Experiences from Resume (with conflict detection)
        for exp in s_json.get("experiences") or []:
            if not isinstance(exp, dict):
                continue
            comp = (exp.get("company") or "").strip()
            role = (exp.get("role_title") or exp.get("title") or "").strip()
            if not comp and not role:
                continue
            exp_key = f"{comp.lower()}::{role.lower()}"
            clean_bullets = _clean_verified_bullets(exp.get("bullets") or [])

            # Check if same company exists with a different role or conflicting dates
            company_matches = [
                (k, v) for k, v in experiences_registry.items()
                if v["company"].lower() == comp.lower() and comp
            ]
            for _, prev_exp in company_matches:
                prev_start = (prev_exp.get("start_date") or "").strip()
                new_start = (exp.get("start_date") or "").strip()
                if prev_start and new_start and prev_start != new_start and prev_exp["role_title"].lower() == role.lower():
                    conflicts.append({
                        "type": "experience_date_mismatch",
                        "entity": f"{role} at {comp}",
                        "field": "start_date",
                        "values": [
                            {"source": prev_exp["sources"][0], "value": f"{prev_start} - {prev_exp.get('end_date') or 'Present'}"},
                            {"source": src_tag, "value": f"{new_start} - {exp.get('end_date') or 'Present'}"},
                        ],
                        "resolution": (
                            f"Preferred verified Master Profile dates ({prev_start})"
                            if prev_exp.get("verified_by_master_profile")
                            else f"Retained primary record ({prev_start}); verify employment dates across resumes."
                        ),
                    })

            if exp_key not in experiences_registry:
                experiences_registry[exp_key] = {
                    "company": comp,
                    "role_title": role,
                    "location": exp.get("location"),
                    "start_date": exp.get("start_date"),
                    "end_date": exp.get("end_date"),
                    "is_current": bool(exp.get("is_current")),
                    "bullets": clean_bullets,
                    "technologies": list(exp.get("technologies") or []),
                    "verified_by_master_profile": False,
                    "sources": [src_tag],
                }
            else:
                existing_exp = experiences_registry[exp_key]
                if src_tag not in existing_exp["sources"]:
                    existing_exp["sources"].append(src_tag)
                for b in clean_bullets:
                    if b not in existing_exp["bullets"]:
                        existing_exp["bullets"].append(b)
            _register_source("experiences", src_tag)

        # 2c. Projects from Resume (deduplicated)
        for proj in s_json.get("projects") or []:
            if not isinstance(proj, dict):
                continue
            ptitle = (proj.get("title") or "").strip()
            if not ptitle:
                continue
            proj_key = re.sub(r"[^a-z0-9]+", "", ptitle.lower())
            clean_bullets = _clean_verified_bullets(proj.get("bullets") or [])
            desc = proj.get("description") or (clean_bullets[0] if clean_bullets else "")
            techs = proj.get("technologies") or []
            if isinstance(techs, str):
                techs = [t.strip() for t in techs.split(",") if t.strip()]

            if proj_key not in projects_registry:
                projects_registry[proj_key] = {
                    "title": ptitle,
                    "description": desc if not _is_ai_placeholder_text(desc) else "",
                    "role": proj.get("role"),
                    "technologies": list(techs),
                    "repo_url": proj.get("repo_url"),
                    "live_url": proj.get("live_url"),
                    "bullets": clean_bullets,
                    "verified_by_master_profile": False,
                    "sources": [src_tag],
                }
            else:
                existing_proj = projects_registry[proj_key]
                if src_tag not in existing_proj["sources"]:
                    existing_proj["sources"].append(src_tag)
                for t in techs:
                    if t not in existing_proj["technologies"]:
                        existing_proj["technologies"].append(t)
                for b in clean_bullets:
                    if b not in existing_proj["bullets"]:
                        existing_proj["bullets"].append(b)
            _register_source("projects", src_tag)

        # 2d. Educations from Resume (with graduation year / GPA conflict detection)
        for edu in s_json.get("educations") or []:
            if not isinstance(edu, dict):
                continue
            inst = (edu.get("institution") or "").strip()
            deg = (edu.get("degree") or "").strip()
            if not inst and not deg:
                continue
            edu_key = re.sub(r"[^a-z0-9]+", "", inst.lower()) or deg.lower()
            if edu_key not in educations_registry:
                educations_registry[edu_key] = {
                    "institution": inst,
                    "degree": deg,
                    "field_of_study": edu.get("field_of_study"),
                    "start_date": edu.get("start_date"),
                    "end_date": edu.get("end_date"),
                    "gpa": edu.get("gpa"),
                    "honors": edu.get("honors"),
                    "verified_by_master_profile": False,
                    "sources": [src_tag],
                }
            else:
                existing_edu = educations_registry[edu_key]
                if src_tag not in existing_edu["sources"]:
                    existing_edu["sources"].append(src_tag)
                prev_end = (existing_edu.get("end_date") or "").strip()
                new_end = (edu.get("end_date") or "").strip()
                if prev_end and new_end and prev_end != new_end:
                    conflicts.append({
                        "type": "education_graduation_mismatch",
                        "entity": inst or deg,
                        "field": "end_date",
                        "values": [
                            {"source": existing_edu["sources"][0], "value": prev_end},
                            {"source": src_tag, "value": new_end},
                        ],
                        "resolution": (
                            f"Preferred verified Master Profile graduation date ({prev_end})"
                            if existing_edu.get("verified_by_master_profile")
                            else f"Retained {prev_end}; reconcile conflicting graduation years across resumes."
                        ),
                    })
            _register_source("educations", src_tag)

        # 2e. Certifications & Achievements
        for cert in s_json.get("certifications") or []:
            if isinstance(cert, dict):
                cname = (cert.get("name") or "").strip()
                issuer = (cert.get("issuer") or "").strip()
            else:
                cname = str(cert).strip()
                issuer = ""
            if not cname:
                continue
            ckey = cname.lower()
            if ckey not in certifications_registry:
                certifications_registry[ckey] = {
                    "name": cname,
                    "issuer": issuer,
                    "sources": [src_tag],
                }
            elif src_tag not in certifications_registry[ckey]["sources"]:
                certifications_registry[ckey]["sources"].append(src_tag)
            _register_source("certifications", src_tag)

        resume_summaries.append({
            "resume_id": res.id,
            "title": res.title,
            "source_type": res.source_type,
            "ats_score": res.ats_score or 80.0,
            "headline": res_headline or headline or "Professional Resume",
            "skills": res_skill_names,
            "strong_skills": res_strong_skills,
            "experience_count": len(s_json.get("experiences") or []),
            "project_count": len(s_json.get("projects") or []),
        })

    # Check location conflict across sources
    unique_locs = {v.lower(): (k, v) for k, v in seen_locations.items() if v}
    if len(unique_locs) > 1:
        conflicts.append({
            "type": "location_mismatch",
            "entity": "Candidate Location",
            "field": "location",
            "values": [{"source": src, "value": val} for src, val in seen_locations.items()],
            "resolution": (
                f"Preferred Master Profile location ({seen_locations.get('master_profile')})"
                if "master_profile" in seen_locations
                else f"Using primary location ({location}); update Master Profile to standardize."
            ),
        })

    # Compute experience years, graduation year, and career stage
    all_experiences = list(experiences_registry.values())
    all_projects = list(projects_registry.values())
    all_educations = list(educations_registry.values())

    total_years, has_internship = _estimate_experience_years(all_experiences)
    grad_years = [_extract_year(ed.get("end_date")) for ed in all_educations]
    grad_years = [y for y in grad_years if y is not None]
    graduation_year = max(grad_years) if grad_years else None

    career_stage = _infer_career_stage(
        total_years=total_years,
        has_internship=has_internship,
        graduation_year=graduation_year,
        experiences_count=len(all_experiences),
    )

    role_intel = infer_candidate_roles(
        skills_map=skills_registry,
        projects=all_projects,
        experiences=all_experiences,
        headline=headline,
        total_years=total_years,
        preferences=preferences,
    )

    unified_profile = {
        "user_id": user.id,
        "full_name": user.full_name,
        "headline": headline or (role_intel["primary_roles"][0] if role_intel["primary_roles"] else "Software Engineer"),
        "summary": summary or "",
        "location": location or "Remote",
        "career_stage": career_stage,
        "total_experience_years": total_years,
        "has_internship_experience": has_internship,
        "graduation_year": graduation_year,
        "skills": list(skills_registry.values()),
        "experiences": all_experiences,
        "projects": all_projects,
        "educations": all_educations,
        "certifications": list(certifications_registry.values()),
        "achievements": achievements_list,
        "inferred_roles": role_intel["primary_roles"],
        "adjacent_roles": role_intel["adjacent_roles"],
        "role_evaluations": role_intel["role_evaluations"],
        "resume_summaries": resume_summaries,
        "preferences_applied": {
            "preferred_roles": preferences.preferred_roles if preferences else [],
            "preferred_locations": preferences.preferred_locations if preferences else [],
            "remote_only": bool(preferences.remote_only) if preferences else False,
            "internship_preference": preferences.internship_preference if preferences else "both",
            "override_inferred_roles": bool(preferences.override_inferred_roles) if preferences else False,
        },
    }

    snapshot = (
        db.query(CandidateProfileSnapshot)
        .filter(CandidateProfileSnapshot.user_id == user.id)
        .first()
    )
    if not snapshot:
        snapshot = CandidateProfileSnapshot(
            user_id=user.id,
            snapshot_version=1,
            unified_profile_json=unified_profile,
            resume_conflicts_json=conflicts,
            source_attribution_json=source_attribution,
            resume_count_analyzed=len(resumes),
        )
        db.add(snapshot)
    else:
        snapshot.snapshot_version = (snapshot.snapshot_version or 1) + 1
        snapshot.unified_profile_json = unified_profile
        snapshot.resume_conflicts_json = conflicts
        snapshot.source_attribution_json = source_attribution
        snapshot.resume_count_analyzed = len(resumes)
        snapshot.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(snapshot)
    return snapshot

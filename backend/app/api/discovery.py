import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db, SessionLocal
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.resume import Resume
from app.models.discovery import (
    JobSource,
    JobListing,
    JobSearchRun,
    JobRecommendation,
    SavedJob,
    JobApplication,
    CandidateProfileSnapshot,
    UserJobPreferences,
    DEFAULT_SCORING_WEIGHTS,
)
from app.schemas.discovery import (
    JobSourceResponse,
    JobListingSchema,
    JobSourceEvidenceSchema,
    JobRecommendationResponse,
    JobSearchRequest,
    JobSearchRunResponse,
    UserJobPreferencesUpdate,
    UserJobPreferencesResponse,
    CandidateProfileSnapshotResponse,
    SaveJobRequest,
    SavedJobResponse,
    ApplyJobRequest,
    JobApplicationResponse,
)
from app.ai.candidate_intelligence import build_candidate_profile_snapshot
from app.ai.job_matcher_ranker import evaluate_job_for_candidate
from app.ai.job_discovery_agent import (
    execute_job_discovery_run,
    generate_recommendation_explanation,
    verify_job_status,
)
from app.services.job_sources import seed_job_sources_and_verified_index

router = APIRouter(prefix="/discovery", tags=["AI Job Discovery & Recommendations"])


def _serialize_job_listing(job: JobListing) -> JobListingSchema:
    evidences = [
        JobSourceEvidenceSchema(
            id=ev.id,
            source_slug=ev.source_slug,
            source_name=ev.source_name,
            source_category=ev.source_category,
            source_url=ev.source_url,
            original_post_excerpt=ev.original_post_excerpt,
            discovered_via_query=ev.discovered_via_query,
            verified_at=ev.verified_at,
        )
        for ev in (job.source_evidences or [])
    ]
    return JobListingSchema(
        id=job.id,
        canonical_fingerprint=job.canonical_fingerprint,
        title=job.title,
        company=job.company,
        company_website=job.company_website,
        original_url=job.original_url,
        application_url=job.application_url,
        primary_source=job.primary_source,
        source_category=job.source_category,
        original_post_excerpt=job.original_post_excerpt,
        description=job.description,
        required_skills=list(job.required_skills or []),
        preferred_skills=list(job.preferred_skills or []),
        education_requirements=job.education_requirements,
        experience_requirements=job.experience_requirements,
        min_experience_years=job.min_experience_years,
        seniority_level=job.seniority_level or "Entry",
        employment_type=job.employment_type or "Full-time",
        is_internship=bool(job.is_internship),
        is_fresher_friendly=bool(job.is_fresher_friendly),
        location=job.location,
        work_arrangement=job.work_arrangement or "Remote",
        salary_text=job.salary_text,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency,
        industry=job.industry,
        is_startup=bool(job.is_startup),
        published_at=job.published_at,
        application_deadline=job.application_deadline,
        availability_status=job.availability_status or "Active",
        last_verified_at=job.last_verified_at,
        discovered_at=job.discovered_at,
        source_evidences=evidences,
    )


def _serialize_recommendation(
    rec: JobRecommendation,
    saved_ids: set,
    app_map: Dict[str, JobApplication],
) -> JobRecommendationResponse:
    app_obj = app_map.get(rec.job_listing_id)
    return JobRecommendationResponse(
        id=rec.id,
        user_id=rec.user_id,
        job_listing_id=rec.job_listing_id,
        search_run_id=rec.search_run_id,
        match_score=rec.match_score,
        score_breakdown=rec.score_breakdown or {},
        eligibility_status=rec.eligibility_status or "Likely eligibility",
        eligibility_reasons=list(rec.eligibility_reasons or []),
        strong_matching_skills=list(rec.strong_matching_skills or []),
        partially_matching_skills=list(rec.partially_matching_skills or []),
        missing_skills=list(rec.missing_skills or []),
        relevant_projects=list(rec.relevant_projects or []),
        education_compatibility=rec.education_compatibility,
        experience_compatibility=rec.experience_compatibility,
        why_recommended=rec.why_recommended or "",
        potential_concerns=list(rec.potential_concerns or []),
        preparation_steps=list(rec.preparation_steps or []),
        best_resume_id=rec.best_resume_id,
        best_resume_title=rec.best_resume_title,
        best_resume_reason=rec.best_resume_reason,
        resume_comparison=list(rec.resume_comparison or []),
        category_tags=list(rec.category_tags or []),
        is_dismissed=bool(rec.is_dismissed),
        is_saved=rec.job_listing_id in saved_ids,
        application_status=app_obj.status if app_obj else None,
        applied_at=app_obj.applied_at if app_obj else None,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
        job=_serialize_job_listing(rec.job_listing),
    )


def _get_or_create_preferences(user_id: str, db: Session) -> UserJobPreferences:
    prefs = db.query(UserJobPreferences).filter(UserJobPreferences.user_id == user_id).first()
    if not prefs:
        prefs = UserJobPreferences(
            user_id=user_id,
            work_arrangements=["Remote", "Hybrid", "On-site"],
            employment_types=["Full-time", "Internship"],
            internship_preference="both",
            min_match_score=30.0,
            scoring_weights=dict(DEFAULT_SCORING_WEIGHTS),
            consent_external_llm=True,
            override_inferred_roles=False,
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


def _rescore_user_recommendations(user: User, db: Session) -> None:
    """Recomputes recommendation scores for all existing JobListings against current profile & preferences."""
    seed_job_sources_and_verified_index(db)
    snapshot = build_candidate_profile_snapshot(user=user, db=db)
    unified_profile = snapshot.unified_profile_json or {}
    prefs = _get_or_create_preferences(user.id, db)

    listings = db.query(JobListing).all()
    now = datetime.now(timezone.utc)
    for listing in listings:
        if listing.availability_status == "Closed":
            continue
        eval_res = evaluate_job_for_candidate(job=listing, unified_profile=unified_profile, preferences=prefs)
        rec = (
            db.query(JobRecommendation)
            .filter(
                JobRecommendation.user_id == user.id,
                JobRecommendation.job_listing_id == listing.id,
            )
            .first()
        )
        if not rec:
            rec = JobRecommendation(
                user_id=user.id,
                job_listing_id=listing.id,
                match_score=eval_res["match_score"],
                score_breakdown=eval_res["score_breakdown"],
                eligibility_status=eval_res["eligibility_status"],
                eligibility_reasons=eval_res["eligibility_reasons"],
                strong_matching_skills=eval_res["strong_matching_skills"],
                partially_matching_skills=eval_res["partially_matching_skills"],
                missing_skills=eval_res["missing_skills"],
                relevant_projects=eval_res["relevant_projects"],
                education_compatibility=eval_res["education_compatibility"],
                experience_compatibility=eval_res["experience_compatibility"],
                why_recommended=eval_res["why_recommended"],
                potential_concerns=eval_res["potential_concerns"],
                preparation_steps=eval_res["preparation_steps"],
                best_resume_id=eval_res["best_resume_id"],
                best_resume_title=eval_res["best_resume_title"],
                best_resume_reason=eval_res["best_resume_reason"],
                resume_comparison=eval_res["resume_comparison"],
                category_tags=eval_res["category_tags"],
            )
            db.add(rec)
        else:
            rec.match_score = eval_res["match_score"]
            rec.score_breakdown = eval_res["score_breakdown"]
            rec.eligibility_status = eval_res["eligibility_status"]
            rec.eligibility_reasons = eval_res["eligibility_reasons"]
            rec.strong_matching_skills = eval_res["strong_matching_skills"]
            rec.partially_matching_skills = eval_res["partially_matching_skills"]
            rec.missing_skills = eval_res["missing_skills"]
            rec.relevant_projects = eval_res["relevant_projects"]
            rec.education_compatibility = eval_res["education_compatibility"]
            rec.experience_compatibility = eval_res["experience_compatibility"]
            rec.why_recommended = eval_res["why_recommended"]
            rec.potential_concerns = eval_res["potential_concerns"]
            rec.preparation_steps = eval_res["preparation_steps"]
            rec.best_resume_id = eval_res["best_resume_id"]
            rec.best_resume_title = eval_res["best_resume_title"]
            rec.best_resume_reason = eval_res["best_resume_reason"]
            rec.resume_comparison = eval_res["resume_comparison"]
            rec.category_tags = eval_res["category_tags"]
            rec.updated_at = now
    db.commit()


# ============================================================================
# 1. SOURCES & INTEGRATIONS STATUS
# ============================================================================

@router.get("/sources", response_model=List[JobSourceResponse])
def list_job_sources(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    seed_job_sources_and_verified_index(db)
    sources = db.query(JobSource).order_by(JobSource.category, JobSource.name).all()
    out: List[JobSourceResponse] = []
    for s in sources:
        env_var = s.api_key_env_var
        configured = True if not s.requires_api_key else bool(env_var and os.getenv(env_var))
        out.append(
            JobSourceResponse(
                id=s.id,
                slug=s.slug,
                name=s.name,
                category=s.category,
                integration_mode=s.integration_mode,
                base_url=s.base_url,
                requires_api_key=bool(s.requires_api_key),
                api_key_env_var=s.api_key_env_var,
                api_key_configured=configured,
                is_enabled=bool(s.is_enabled),
                rate_limit_rpm=s.rate_limit_rpm or 30,
                description=s.description,
            )
        )
    return out


# ============================================================================
# 2. CANDIDATE PROFILE INTELLIGENCE CONTEXT
# ============================================================================

@router.get("/candidate-context", response_model=CandidateProfileSnapshotResponse)
def get_candidate_context(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    snapshot = (
        db.query(CandidateProfileSnapshot)
        .filter(CandidateProfileSnapshot.user_id == current_user.id)
        .first()
    )
    if not snapshot:
        snapshot = build_candidate_profile_snapshot(user=current_user, db=db)
    return snapshot


@router.post("/candidate-context/rebuild", response_model=CandidateProfileSnapshotResponse)
def rebuild_candidate_context(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    snapshot = build_candidate_profile_snapshot(user=current_user, db=db, force_rebuild=True)
    _rescore_user_recommendations(user=current_user, db=db)
    return snapshot


# ============================================================================
# 3. USER JOB PREFERENCES & SEARCH CONTROLS
# ============================================================================

@router.get("/preferences", response_model=UserJobPreferencesResponse)
def get_job_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return _get_or_create_preferences(current_user.id, db)


@router.put("/preferences", response_model=UserJobPreferencesResponse)
def update_job_preferences(
    payload: UserJobPreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    prefs = _get_or_create_preferences(current_user.id, db)
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prefs, field, val)
    prefs.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(prefs)

    # Rebuild candidate context & rescore recommendations immediately
    _rescore_user_recommendations(user=current_user, db=db)
    return prefs


# ============================================================================
# 4. JOB DISCOVERY SEARCH RUNS & PROGRESS TRACKING
# ============================================================================

def _background_search_worker(
    search_run_id: str,
    user_id: str,
    custom_queries: Optional[List[str]],
    preferred_sources: Optional[List[str]],
    force_refresh_profile: bool,
):
    db = SessionLocal()
    try:
        execute_job_discovery_run(
            search_run_id=search_run_id,
            user_id=user_id,
            db=db,
            custom_queries=custom_queries,
            preferred_sources=preferred_sources,
            force_refresh_profile=force_refresh_profile,
        )
    finally:
        db.close()


@router.post("/search", response_model=JobSearchRunResponse, status_code=status.HTTP_201_CREATED)
def start_job_discovery_search(
    payload: JobSearchRequest = JobSearchRequest(),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    run = JobSearchRun(
        user_id=current_user.id,
        status="pending",
        current_stage=1,
        current_stage_label="Understanding your profile",
        progress_pct=5,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    if payload.run_in_background and background_tasks is not None:
        background_tasks.add_task(
            _background_search_worker,
            run.id,
            current_user.id,
            payload.custom_queries,
            payload.preferred_sources,
            payload.force_refresh_profile,
        )
        return run

    completed_run = execute_job_discovery_run(
        search_run_id=run.id,
        user_id=current_user.id,
        db=db,
        custom_queries=payload.custom_queries,
        preferred_sources=payload.preferred_sources,
        force_refresh_profile=payload.force_refresh_profile,
    )
    return completed_run


@router.get("/search/{search_run_id}", response_model=JobSearchRunResponse)
def get_job_search_status(
    search_run_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(JobSearchRun)
        .filter(JobSearchRun.id == search_run_id, JobSearchRun.user_id == current_user.id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Job search run not found")
    return run


@router.post("/search/{search_run_id}/cancel", response_model=JobSearchRunResponse)
def cancel_job_search(
    search_run_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(JobSearchRun)
        .filter(JobSearchRun.id == search_run_id, JobSearchRun.user_id == current_user.id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Job search run not found")
    run.cancel_requested = True
    if run.status in ("pending", "running"):
        run.status = "cancelled"
        run.current_stage_label = "Search cancelled by user"
        run.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(run)
    return run


@router.get("/search-history", response_model=List[JobSearchRunResponse])
def get_search_history(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(JobSearchRun)
        .filter(JobSearchRun.user_id == current_user.id)
        .order_by(JobSearchRun.started_at.desc())
        .limit(limit)
        .all()
    )


# ============================================================================
# 5. PERSONALIZED RECOMMENDATIONS & MULTI-FACETED FILTERING
# ============================================================================

@router.get("/recommendations", response_model=List[JobRecommendationResponse])
def get_personalized_recommendations(
    category_tab: Optional[str] = Query(None, description="all | best_match | latest | internship | fresher_friendly | remote | startup | saved | applied"),
    role: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    work_arrangement: Optional[str] = Query(None),
    employment_type: Optional[str] = Query(None),
    experience_level: Optional[str] = Query(None),
    min_salary: Optional[float] = Query(None),
    company: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    min_match_score: Optional[float] = Query(None),
    application_status: Optional[str] = Query(None),
    resume_id: Optional[str] = Query(None),
    include_dismissed: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Ensure initial recommendations exist for this user
    rec_count = db.query(JobRecommendation).filter(JobRecommendation.user_id == current_user.id).count()
    if rec_count == 0:
        _rescore_user_recommendations(user=current_user, db=db)

    query = db.query(JobRecommendation).filter(JobRecommendation.user_id == current_user.id)
    if not include_dismissed:
        query = query.filter(JobRecommendation.is_dismissed == False)

    recs = query.all()

    saved_ids = {
        s.job_listing_id
        for s in db.query(SavedJob).filter(SavedJob.user_id == current_user.id).all()
    }
    app_map = {
        a.job_listing_id: a
        for a in db.query(JobApplication).filter(JobApplication.user_id == current_user.id).all()
    }

    filtered: List[JobRecommendationResponse] = []
    for r in recs:
        job = r.job_listing
        if not job:
            continue

        # Category tab filter
        if category_tab and category_tab not in ("all", "recommended"):
            if category_tab == "saved" and job.id not in saved_ids:
                continue
            elif category_tab == "applied" and job.id not in app_map:
                continue
            elif category_tab in ("best_match", "latest", "internship", "fresher_friendly", "remote", "startup"):
                tags = r.category_tags or []
                if category_tab not in tags:
                    continue

        if role and role.strip():
            rl = role.strip().lower()
            if rl not in (job.title or "").lower() and rl not in (job.description or "").lower():
                continue

        if skill and skill.strip():
            sk_low = skill.strip().lower()
            job_skills_low = [str(s).lower() for s in (job.required_skills or []) + (job.preferred_skills or [])]
            if not any(sk_low in js for js in job_skills_low) and sk_low not in (job.description or "").lower():
                continue

        if location and location.strip():
            loc_low = location.strip().lower()
            if loc_low not in (job.location or "").lower():
                continue

        if work_arrangement and work_arrangement.strip() and work_arrangement.lower() != "all":
            if (job.work_arrangement or "").lower() != work_arrangement.strip().lower():
                continue

        if employment_type and employment_type.strip() and employment_type.lower() != "all":
            if (job.employment_type or "").lower() != employment_type.strip().lower():
                continue

        if experience_level and experience_level.strip() and experience_level.lower() != "all":
            exp_low = experience_level.strip().lower()
            if exp_low in ("fresher", "entry") and not (job.is_fresher_friendly or (job.seniority_level or "").lower() == "entry"):
                continue
            elif exp_low == "internship" and not job.is_internship:
                continue
            elif exp_low in ("mid", "senior", "lead") and (job.seniority_level or "").lower() != exp_low:
                continue

        if min_salary is not None and min_salary > 0:
            if not job.salary_max or job.salary_max < min_salary:
                continue

        if company and company.strip():
            if company.strip().lower() not in (job.company or "").lower():
                continue

        if industry and industry.strip():
            if industry.strip().lower() not in (job.industry or "").lower():
                continue

        if source and source.strip() and source.lower() != "all":
            src_low = source.strip().lower()
            ev_names = [ev.source_name.lower() for ev in (job.source_evidences or [])] + [
                (job.primary_source or "").lower(),
                (job.source_category or "").lower(),
            ]
            if not any(src_low in en for en in ev_names):
                continue

        if min_match_score is not None:
            if r.match_score < min_match_score:
                continue

        if application_status and application_status.strip() and application_status.lower() != "all":
            st_low = application_status.strip().lower()
            user_app = app_map.get(job.id)
            if st_low == "not_applied" and user_app is not None:
                continue
            elif st_low != "not_applied" and (not user_app or user_app.status.lower() != st_low):
                continue

        if resume_id and resume_id.strip():
            if r.best_resume_id and r.best_resume_id != resume_id.strip():
                # Check if resume_id is in resume_comparison with decent score
                comp_map = {c.get("resume_id"): c for c in (r.resume_comparison or [])}
                if resume_id.strip() not in comp_map:
                    continue

        filtered.append(_serialize_recommendation(r, saved_ids, app_map))

    # Sort eligible opportunities above "Not eligible based on available information", then by match_score desc
    filtered.sort(
        key=lambda item: (
            0 if item.eligibility_status == "Not eligible based on available information" else 1,
            item.match_score,
        ),
        reverse=True,
    )
    return filtered


# ============================================================================
# 6. JOB DETAILS, EXPLANATION & VERIFICATION REFRESH
# ============================================================================

@router.get("/jobs/{job_id}", response_model=JobRecommendationResponse)
def get_job_recommendation_detail(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    rec = (
        db.query(JobRecommendation)
        .filter(
            JobRecommendation.user_id == current_user.id,
            JobRecommendation.job_listing_id == job.id,
        )
        .first()
    )
    if not rec:
        _rescore_user_recommendations(user=current_user, db=db)
        rec = (
            db.query(JobRecommendation)
            .filter(
                JobRecommendation.user_id == current_user.id,
                JobRecommendation.job_listing_id == job.id,
            )
            .first()
        )
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation record could not be generated")

    saved_ids = {
        s.job_listing_id
        for s in db.query(SavedJob).filter(SavedJob.user_id == current_user.id).all()
    }
    app_map = {
        a.job_listing_id: a
        for a in db.query(JobApplication).filter(JobApplication.user_id == current_user.id).all()
    }
    return _serialize_recommendation(rec, saved_ids, app_map)


@router.get("/jobs/{job_id}/explanation", response_model=JobRecommendationResponse)
def get_or_refresh_job_explanation(
    job_id: str,
    refresh_llm: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    snapshot = (
        db.query(CandidateProfileSnapshot)
        .filter(CandidateProfileSnapshot.user_id == current_user.id)
        .first()
    ) or build_candidate_profile_snapshot(user=current_user, db=db)
    prefs = _get_or_create_preferences(current_user.id, db)

    eval_res = evaluate_job_for_candidate(
        job=job,
        unified_profile=snapshot.unified_profile_json or {},
        preferences=prefs,
    )
    expl = generate_recommendation_explanation(
        job=job,
        unified_profile=snapshot.unified_profile_json or {},
        evaluation=eval_res,
        consent_external_llm=bool(prefs.consent_external_llm) if refresh_llm else False,
    )

    rec = (
        db.query(JobRecommendation)
        .filter(
            JobRecommendation.user_id == current_user.id,
            JobRecommendation.job_listing_id == job.id,
        )
        .first()
    )
    if not rec:
        rec = JobRecommendation(
            user_id=current_user.id,
            job_listing_id=job.id,
            match_score=eval_res["match_score"],
            score_breakdown=eval_res["score_breakdown"],
            eligibility_status=eval_res["eligibility_status"],
            eligibility_reasons=eval_res["eligibility_reasons"],
            strong_matching_skills=eval_res["strong_matching_skills"],
            partially_matching_skills=eval_res["partially_matching_skills"],
            missing_skills=eval_res["missing_skills"],
            relevant_projects=eval_res["relevant_projects"],
            education_compatibility=eval_res["education_compatibility"],
            experience_compatibility=eval_res["experience_compatibility"],
            why_recommended=expl["why_recommended"],
            potential_concerns=expl["potential_concerns"],
            preparation_steps=expl["preparation_steps"],
            best_resume_id=eval_res["best_resume_id"],
            best_resume_title=eval_res["best_resume_title"],
            best_resume_reason=eval_res["best_resume_reason"],
            resume_comparison=eval_res["resume_comparison"],
            category_tags=eval_res["category_tags"],
        )
        db.add(rec)
    else:
        rec.why_recommended = expl["why_recommended"]
        rec.potential_concerns = expl["potential_concerns"]
        rec.preparation_steps = expl["preparation_steps"]
        rec.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)

    saved_ids = {
        s.job_listing_id
        for s in db.query(SavedJob).filter(SavedJob.user_id == current_user.id).all()
    }
    app_map = {
        a.job_listing_id: a
        for a in db.query(JobApplication).filter(JobApplication.user_id == current_user.id).all()
    }
    return _serialize_recommendation(rec, saved_ids, app_map)


@router.post("/jobs/{job_id}/verify", response_model=JobListingSchema)
def verify_job_listing_endpoint(
    job_id: str,
    live_check: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    status_val, verified_ts = verify_job_status(job, perform_live_check=live_check)
    job.availability_status = status_val
    job.last_verified_at = verified_ts
    db.commit()
    db.refresh(job)
    return _serialize_job_listing(job)


# ============================================================================
# 7. SAVING, DISMISSING & TRACKING JOB APPLICATIONS
# ============================================================================

@router.post("/jobs/{job_id}/save", response_model=SavedJobResponse, status_code=status.HTTP_201_CREATED)
def save_job(
    job_id: str,
    payload: SaveJobRequest = SaveJobRequest(),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    saved = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_listing_id == job_id)
        .first()
    )
    if not saved:
        saved = SavedJob(user_id=current_user.id, job_listing_id=job_id, notes=payload.notes)
        db.add(saved)
    else:
        if payload.notes is not None:
            saved.notes = payload.notes
    db.commit()
    db.refresh(saved)

    rec = (
        db.query(JobRecommendation)
        .filter(JobRecommendation.user_id == current_user.id, JobRecommendation.job_listing_id == job_id)
        .first()
    )
    return SavedJobResponse(
        id=saved.id,
        user_id=saved.user_id,
        job_listing_id=saved.job_listing_id,
        notes=saved.notes,
        created_at=saved.created_at,
        job=_serialize_job_listing(job),
        match_score=rec.match_score if rec else None,
    )


@router.delete("/jobs/{job_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def unsave_job(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    saved = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_listing_id == job_id)
        .first()
    )
    if saved:
        db.delete(saved)
        db.commit()


@router.get("/saved", response_model=List[SavedJobResponse])
def list_saved_jobs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id)
        .order_by(SavedJob.created_at.desc())
        .all()
    )
    rec_map = {
        r.job_listing_id: r.match_score
        for r in db.query(JobRecommendation).filter(JobRecommendation.user_id == current_user.id).all()
    }
    return [
        SavedJobResponse(
            id=s.id,
            user_id=s.user_id,
            job_listing_id=s.job_listing_id,
            notes=s.notes,
            created_at=s.created_at,
            job=_serialize_job_listing(s.job_listing),
            match_score=rec_map.get(s.job_listing_id),
        )
        for s in rows
        if s.job_listing
    ]


@router.post("/jobs/{job_id}/dismiss", response_model=JobRecommendationResponse)
def dismiss_recommendation(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    rec = (
        db.query(JobRecommendation)
        .filter(JobRecommendation.user_id == current_user.id, JobRecommendation.job_listing_id == job_id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.is_dismissed = True
    rec.dismissed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)

    saved_ids = {
        s.job_listing_id
        for s in db.query(SavedJob).filter(SavedJob.user_id == current_user.id).all()
    }
    app_map = {
        a.job_listing_id: a
        for a in db.query(JobApplication).filter(JobApplication.user_id == current_user.id).all()
    }
    return _serialize_recommendation(rec, saved_ids, app_map)


@router.post("/jobs/{job_id}/undismiss", response_model=JobRecommendationResponse)
def undismiss_recommendation(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    rec = (
        db.query(JobRecommendation)
        .filter(JobRecommendation.user_id == current_user.id, JobRecommendation.job_listing_id == job_id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.is_dismissed = False
    rec.dismissed_at = None
    db.commit()
    db.refresh(rec)

    saved_ids = {
        s.job_listing_id
        for s in db.query(SavedJob).filter(SavedJob.user_id == current_user.id).all()
    }
    app_map = {
        a.job_listing_id: a
        for a in db.query(JobApplication).filter(JobApplication.user_id == current_user.id).all()
    }
    return _serialize_recommendation(rec, saved_ids, app_map)


@router.post("/jobs/{job_id}/apply", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def mark_job_as_applied(
    job_id: str,
    payload: ApplyJobRequest = ApplyJobRequest(),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobListing).filter(JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    resume_title = None
    if payload.resume_id:
        res_obj = (
            db.query(Resume)
            .filter(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
            .first()
        )
        if not res_obj:
            raise HTTPException(status_code=404, detail="Selected resume not found for current user")
        resume_title = res_obj.title

    app_rec = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id, JobApplication.job_listing_id == job_id)
        .first()
    )
    now = datetime.now(timezone.utc)
    if not app_rec:
        app_rec = JobApplication(
            user_id=current_user.id,
            job_listing_id=job_id,
            resume_id=payload.resume_id,
            status=payload.status or "Applied",
            applied_via_url=payload.applied_via_url or job.application_url,
            notes=payload.notes,
            applied_at=now,
            updated_at=now,
        )
        db.add(app_rec)
    else:
        if payload.resume_id is not None:
            app_rec.resume_id = payload.resume_id
        if payload.status:
            app_rec.status = payload.status
        if payload.notes is not None:
            app_rec.notes = payload.notes
        app_rec.updated_at = now

    db.commit()
    db.refresh(app_rec)

    if app_rec.resume_id and not resume_title:
        r_obj = db.query(Resume).filter(Resume.id == app_rec.resume_id).first()
        if r_obj:
            resume_title = r_obj.title

    rec = (
        db.query(JobRecommendation)
        .filter(JobRecommendation.user_id == current_user.id, JobRecommendation.job_listing_id == job_id)
        .first()
    )
    return JobApplicationResponse(
        id=app_rec.id,
        user_id=app_rec.user_id,
        job_listing_id=app_rec.job_listing_id,
        resume_id=app_rec.resume_id,
        resume_title=resume_title,
        status=app_rec.status,
        applied_via_url=app_rec.applied_via_url,
        notes=app_rec.notes,
        applied_at=app_rec.applied_at,
        updated_at=app_rec.updated_at,
        job=_serialize_job_listing(job),
        match_score=rec.match_score if rec else None,
    )


@router.get("/applications", response_model=List[JobApplicationResponse])
def list_job_applications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )
    rec_map = {
        r.job_listing_id: r.match_score
        for r in db.query(JobRecommendation).filter(JobRecommendation.user_id == current_user.id).all()
    }
    res_map = {
        r.id: r.title
        for r in db.query(Resume).filter(Resume.user_id == current_user.id).all()
    }
    return [
        JobApplicationResponse(
            id=a.id,
            user_id=a.user_id,
            job_listing_id=a.job_listing_id,
            resume_id=a.resume_id,
            resume_title=res_map.get(a.resume_id) if a.resume_id else None,
            status=a.status,
            applied_via_url=a.applied_via_url,
            notes=a.notes,
            applied_at=a.applied_at,
            updated_at=a.updated_at,
            job=_serialize_job_listing(a.job_listing),
            match_score=rec_map.get(a.job_listing_id),
        )
        for a in apps
        if a.job_listing
    ]

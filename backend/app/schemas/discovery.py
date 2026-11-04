from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class JobSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    name: str
    category: str
    integration_mode: str
    base_url: Optional[str] = None
    requires_api_key: bool = False
    api_key_env_var: Optional[str] = None
    api_key_configured: bool = False
    is_enabled: bool = True
    rate_limit_rpm: int = 30
    description: Optional[str] = None


class JobSourceEvidenceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    source_slug: str
    source_name: str
    source_category: str
    source_url: str
    original_post_excerpt: Optional[str] = None
    discovered_via_query: Optional[str] = None
    verified_at: Optional[datetime] = None


class JobListingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    canonical_fingerprint: str
    title: str
    company: str
    company_website: Optional[str] = None
    original_url: str
    application_url: str
    primary_source: str
    source_category: str
    original_post_excerpt: Optional[str] = None
    description: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    education_requirements: Optional[str] = None
    experience_requirements: Optional[str] = None
    min_experience_years: Optional[float] = None
    seniority_level: str = "Entry"
    employment_type: str = "Full-time"
    is_internship: bool = False
    is_fresher_friendly: bool = False
    location: Optional[str] = None
    work_arrangement: str = "Remote"
    salary_text: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    industry: Optional[str] = None
    is_startup: bool = False
    published_at: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    availability_status: str = "Active"
    last_verified_at: Optional[datetime] = None
    discovered_at: Optional[datetime] = None
    source_evidences: List[JobSourceEvidenceSchema] = Field(default_factory=list)


class ResumeComparisonItem(BaseModel):
    resume_id: str
    resume_title: str
    match_score: float
    matched_required_skills: List[str] = Field(default_factory=list)
    matched_preferred_skills: List[str] = Field(default_factory=list)
    strong_evidence_count: int = 0
    reason: str = ""


class JobRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    job_listing_id: str
    search_run_id: Optional[str] = None
    match_score: float
    score_breakdown: Dict[str, float] = Field(default_factory=dict)
    eligibility_status: str
    eligibility_reasons: List[str] = Field(default_factory=list)
    strong_matching_skills: List[str] = Field(default_factory=list)
    partially_matching_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    relevant_projects: List[str] = Field(default_factory=list)
    education_compatibility: Optional[str] = None
    experience_compatibility: Optional[str] = None
    why_recommended: str
    potential_concerns: List[str] = Field(default_factory=list)
    preparation_steps: List[str] = Field(default_factory=list)
    best_resume_id: Optional[str] = None
    best_resume_title: Optional[str] = None
    best_resume_reason: Optional[str] = None
    resume_comparison: List[ResumeComparisonItem] = Field(default_factory=list)
    category_tags: List[str] = Field(default_factory=list)
    is_dismissed: bool = False
    is_saved: bool = False
    application_status: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    job: JobListingSchema


class JobSearchRequest(BaseModel):
    custom_queries: Optional[List[str]] = None
    preferred_sources: Optional[List[str]] = None
    force_refresh_profile: bool = False
    run_in_background: bool = False


class JobSearchRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    status: str
    current_stage: int
    current_stage_label: str
    progress_pct: int
    generated_queries: List[str] = Field(default_factory=list)
    sources_queried: List[Dict[str, Any]] = Field(default_factory=list)
    total_discovered: int = 0
    duplicates_consolidated: int = 0
    recommendations_created: int = 0
    cancel_requested: bool = False
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class UserJobPreferencesUpdate(BaseModel):
    preferred_roles: Optional[List[str]] = None
    alternative_roles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    remote_only: Optional[bool] = None
    work_arrangements: Optional[List[str]] = None
    employment_types: Optional[List[str]] = None
    internship_preference: Optional[str] = None
    preferred_industries: Optional[List[str]] = None
    min_match_score: Optional[float] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    excluded_companies: Optional[List[str]] = None
    excluded_categories: Optional[List[str]] = None
    preferred_sources: Optional[List[str]] = None
    search_frequency: Optional[str] = None
    scoring_weights: Optional[Dict[str, float]] = None
    consent_external_llm: Optional[bool] = None
    override_inferred_roles: Optional[bool] = None


class UserJobPreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    preferred_roles: List[str] = Field(default_factory=list)
    alternative_roles: List[str] = Field(default_factory=list)
    preferred_locations: List[str] = Field(default_factory=list)
    remote_only: bool = False
    work_arrangements: List[str] = Field(default_factory=list)
    employment_types: List[str] = Field(default_factory=list)
    internship_preference: str = "both"
    preferred_industries: List[str] = Field(default_factory=list)
    min_match_score: float = 30.0
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "USD"
    excluded_companies: List[str] = Field(default_factory=list)
    excluded_categories: List[str] = Field(default_factory=list)
    preferred_sources: List[str] = Field(default_factory=list)
    search_frequency: str = "manual"
    scoring_weights: Dict[str, float] = Field(default_factory=dict)
    consent_external_llm: bool = True
    override_inferred_roles: bool = False
    updated_at: Optional[datetime] = None


class CandidateProfileSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    snapshot_version: int
    unified_profile_json: Dict[str, Any] = Field(default_factory=dict)
    resume_conflicts_json: List[Dict[str, Any]] = Field(default_factory=list)
    source_attribution_json: Dict[str, Any] = Field(default_factory=dict)
    resume_count_analyzed: int = 0
    updated_at: Optional[datetime] = None


class SaveJobRequest(BaseModel):
    notes: Optional[str] = None


class SavedJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    job_listing_id: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    job: JobListingSchema
    match_score: Optional[float] = None


class ApplyJobRequest(BaseModel):
    resume_id: Optional[str] = None
    status: str = "Applied"
    applied_via_url: Optional[str] = None
    notes: Optional[str] = None


class JobApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    job_listing_id: str
    resume_id: Optional[str] = None
    resume_title: Optional[str] = None
    status: str = "Applied"
    applied_via_url: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    job: JobListingSchema
    match_score: Optional[float] = None

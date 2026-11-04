import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


DEFAULT_SCORING_WEIGHTS = {
    "skill_compatibility": 0.25,
    "experience_project_relevance": 0.20,
    "role_alignment": 0.15,
    "education_eligibility": 0.15,
    "location_work_preference": 0.10,
    "job_freshness_availability": 0.10,
    "other_preferences": 0.05,
}


class JobSource(Base):
    __tablename__ = "job_sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), index=True, nullable=False)
    integration_mode = Column(String(100), nullable=False, default="working_public_api")
    base_url = Column(String(500), nullable=True)
    requires_api_key = Column(Boolean, default=False)
    api_key_env_var = Column(String(100), nullable=True)
    is_enabled = Column(Boolean, default=True)
    rate_limit_rpm = Column(Integer, default=30)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canonical_fingerprint = Column(String(255), unique=True, index=True, nullable=False)

    title = Column(String(255), index=True, nullable=False)
    company = Column(String(255), index=True, nullable=False)
    company_website = Column(String(500), nullable=True)
    original_url = Column(String(1000), nullable=False)
    application_url = Column(String(1000), nullable=False)
    primary_source = Column(String(100), index=True, nullable=False)
    source_category = Column(String(100), index=True, nullable=False, default="mainstream_portal")
    original_post_excerpt = Column(Text, nullable=True)

    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)
    preferred_skills = Column(JSON, default=list)
    education_requirements = Column(String(500), nullable=True)
    experience_requirements = Column(String(255), nullable=True)
    min_experience_years = Column(Float, nullable=True)
    seniority_level = Column(String(50), default="Entry")

    employment_type = Column(String(50), default="Full-time")
    is_internship = Column(Boolean, default=False, index=True)
    is_fresher_friendly = Column(Boolean, default=False, index=True)
    location = Column(String(255), nullable=True, index=True)
    work_arrangement = Column(String(50), default="Remote", index=True)
    salary_text = Column(String(255), nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(20), nullable=True)
    industry = Column(String(150), nullable=True, index=True)
    is_startup = Column(Boolean, default=False, index=True)

    published_at = Column(DateTime, nullable=True)
    application_deadline = Column(DateTime, nullable=True)
    availability_status = Column(String(50), default="Active", index=True)
    last_verified_at = Column(DateTime, default=utc_now)
    discovered_at = Column(DateTime, default=utc_now)
    raw_metadata = Column(JSON, default=dict)

    # Relationships
    source_evidences = relationship(
        "JobSourceEvidence",
        back_populates="job_listing",
        cascade="all, delete-orphan",
    )
    recommendations = relationship(
        "JobRecommendation",
        back_populates="job_listing",
        cascade="all, delete-orphan",
    )
    saved_by_users = relationship(
        "SavedJob",
        back_populates="job_listing",
        cascade="all, delete-orphan",
    )
    applications = relationship(
        "JobApplication",
        back_populates="job_listing",
        cascade="all, delete-orphan",
    )


class JobSourceEvidence(Base):
    __tablename__ = "job_source_evidences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_listing_id = Column(
        String(36),
        ForeignKey("job_listings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_slug = Column(String(100), nullable=False)
    source_name = Column(String(255), nullable=False)
    source_category = Column(String(100), nullable=False, default="mainstream_portal")
    source_url = Column(String(1000), nullable=False)
    original_post_excerpt = Column(Text, nullable=True)
    discovered_via_query = Column(String(500), nullable=True)
    verified_at = Column(DateTime, default=utc_now)

    job_listing = relationship("JobListing", back_populates="source_evidences")

    __table_args__ = (
        UniqueConstraint("job_listing_id", "source_url", name="uq_job_source_evidence_url"),
    )


class CandidateProfileSnapshot(Base):
    __tablename__ = "candidate_profile_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    snapshot_version = Column(Integer, default=1)
    unified_profile_json = Column(JSON, default=dict)
    resume_conflicts_json = Column(JSON, default=list)
    source_attribution_json = Column(JSON, default=dict)
    resume_count_analyzed = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="profile_snapshot")


class UserJobPreferences(Base):
    __tablename__ = "user_job_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    preferred_roles = Column(JSON, default=list)
    alternative_roles = Column(JSON, default=list)
    preferred_locations = Column(JSON, default=list)
    remote_only = Column(Boolean, default=False)
    work_arrangements = Column(JSON, default=lambda: ["Remote", "Hybrid", "On-site"])
    employment_types = Column(JSON, default=lambda: ["Full-time", "Internship"])
    internship_preference = Column(String(50), default="both")
    preferred_industries = Column(JSON, default=list)
    min_match_score = Column(Float, default=30.0)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(20), default="USD")
    excluded_companies = Column(JSON, default=list)
    excluded_categories = Column(JSON, default=list)
    preferred_sources = Column(JSON, default=list)
    search_frequency = Column(String(50), default="manual")
    scoring_weights = Column(JSON, default=lambda: dict(DEFAULT_SCORING_WEIGHTS))
    consent_external_llm = Column(Boolean, default=True)
    override_inferred_roles = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="job_preferences")


class JobSearchRun(Base):
    __tablename__ = "job_search_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status = Column(String(50), default="pending", index=True)
    current_stage = Column(Integer, default=1)
    current_stage_label = Column(String(255), default="Understanding your profile")
    progress_pct = Column(Integer, default=0)
    generated_queries = Column(JSON, default=list)
    sources_queried = Column(JSON, default=list)
    total_discovered = Column(Integer, default=0)
    duplicates_consolidated = Column(Integer, default=0)
    recommendations_created = Column(Integer, default=0)
    cancel_requested = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="job_search_runs")
    recommendations = relationship("JobRecommendation", back_populates="search_run")


class JobRecommendation(Base):
    __tablename__ = "job_recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    job_listing_id = Column(
        String(36),
        ForeignKey("job_listings.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    search_run_id = Column(
        String(36),
        ForeignKey("job_search_runs.id", ondelete="SET NULL"),
        nullable=True,
    )

    match_score = Column(Float, nullable=False, index=True)
    score_breakdown = Column(JSON, default=dict)
    eligibility_status = Column(String(100), default="Likely eligibility")
    eligibility_reasons = Column(JSON, default=list)

    strong_matching_skills = Column(JSON, default=list)
    partially_matching_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    relevant_projects = Column(JSON, default=list)
    education_compatibility = Column(Text, nullable=True)
    experience_compatibility = Column(Text, nullable=True)
    why_recommended = Column(Text, nullable=False)
    potential_concerns = Column(JSON, default=list)
    preparation_steps = Column(JSON, default=list)

    best_resume_id = Column(String(36), nullable=True)
    best_resume_title = Column(String(255), nullable=True)
    best_resume_reason = Column(Text, nullable=True)
    resume_comparison = Column(JSON, default=list)
    category_tags = Column(JSON, default=list)

    is_dismissed = Column(Boolean, default=False, index=True)
    dismissed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="job_recommendations")
    job_listing = relationship("JobListing", back_populates="recommendations")
    search_run = relationship("JobSearchRun", back_populates="recommendations")

    __table_args__ = (
        UniqueConstraint("user_id", "job_listing_id", name="uq_user_job_recommendation"),
        Index("ix_user_rec_score", "user_id", "is_dismissed", "match_score"),
    )


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    job_listing_id = Column(
        String(36),
        ForeignKey("job_listings.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="saved_jobs")
    job_listing = relationship("JobListing", back_populates="saved_by_users")

    __table_args__ = (
        UniqueConstraint("user_id", "job_listing_id", name="uq_user_saved_job"),
    )


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    job_listing_id = Column(
        String(36),
        ForeignKey("job_listings.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    resume_id = Column(
        String(36),
        ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(String(50), default="Applied")
    applied_via_url = Column(String(1000), nullable=True)
    notes = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="job_applications")
    job_listing = relationship("JobListing", back_populates="applications")

    __table_args__ = (
        UniqueConstraint("user_id", "job_listing_id", name="uq_user_job_application"),
    )

"""
Database Migration 001: AI Job Discovery & Intelligent Recommendation Engine
Creates the 9 Job Discovery tables and indexes if they do not exist, and seeds
the registered JobSource catalog.
"""
from sqlalchemy import inspect
from app.database.session import Base, engine, SessionLocal
from app.models.discovery import (
    JobSource,
    JobListing,
    JobSourceEvidence,
    CandidateProfileSnapshot,
    UserJobPreferences,
    JobSearchRun,
    JobRecommendation,
    SavedJob,
    JobApplication,
)
from app.services.job_sources import seed_job_sources_and_verified_index


DISCOVERY_TABLES = [
    "job_sources",
    "job_listings",
    "job_source_evidences",
    "candidate_profile_snapshots",
    "user_job_preferences",
    "job_search_runs",
    "job_recommendations",
    "saved_jobs",
    "job_applications",
]


def upgrade() -> dict:
    inspector = inspect(engine)
    before = set(inspector.get_table_names())
    Base.metadata.create_all(bind=engine)
    after = set(inspect(engine).get_table_names())

    db = SessionLocal()
    try:
        seed_job_sources_and_verified_index(db)
    finally:
        db.close()

    created = sorted(list((after - before).intersection(set(DISCOVERY_TABLES))))
    return {
        "migration": "001_job_discovery_engine",
        "tables_verified": DISCOVERY_TABLES,
        "tables_newly_created": created,
    }


if __name__ == "__main__":
    result = upgrade()
    print(f"[MIGRATION] {result}")

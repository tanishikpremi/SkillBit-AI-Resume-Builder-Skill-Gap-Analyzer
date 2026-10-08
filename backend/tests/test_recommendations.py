import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.ai.recommendation_engine import generate_recommendation_for_gap
from app.ai.resume_content_generator import generate_star_bullet_suggestions

@pytest.fixture(scope="module")
def test_client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    init_db_session = TestingSessionLocal()
    init_db(db=init_db_session)
    init_db_session.close()
    
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, TestingSessionLocal()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

def test_recommendation_logic():
    # 1. Missing skill recommendation
    rec_missing = generate_recommendation_for_gap(
        skill_name="Kubernetes",
        gap_status="MISSING",
        importance="HIGH"
    )
    assert "Kubernetes" in rec_missing["learning_topic"]
    assert len(rec_missing["concepts"]) > 0
    assert "practice_project" in rec_missing
    assert "CKAD" in rec_missing["certification_name"]
    assert "kubernetes.io" in rec_missing["resource_url"]

    # 2. Weak evidence recommendation
    rec_weak = generate_recommendation_for_gap(
        skill_name="FastAPI",
        gap_status="WEAK_EVIDENCE",
        importance="HIGH",
        evidence_snippet="Listed under skills"
    )
    assert "FastAPI" in rec_weak["learning_topic"]
    assert "Strengthen your resume by rewriting your existing bullets" in rec_weak["suggested_resume_bullet"]

def test_star_bullet_generator():
    raw_bullet = "worked on api endpoints for authentication"
    result = generate_star_bullet_suggestions(
        raw_bullet=raw_bullet,
        target_skill="FastAPI"
    )
    assert result["methodology"].startswith("STAR")
    assert "Engineered" in result["suggested_bullet"]
    assert "FastAPI" in result["suggested_bullet"]
    assert result["is_editable"] is True

def test_recommendations_and_bullet_api(test_client):
    client, _ = test_client

    # 1. Register & login
    client.post("/api/auth/register", json={
        "email": "dev.recs@careertech.ai",
        "password": "Password123!",
        "full_name": "Dev Recs"
    })
    token = client.post("/api/auth/login", json={
        "email": "dev.recs@careertech.ai",
        "password": "Password123!"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test bullet suggestion endpoint directly
    bullet_res = client.post("/api/resume/suggest-bullets", headers=headers, json={
        "raw_bullet": "helped with docker container deployment",
        "target_skill": "Docker"
    })
    assert bullet_res.status_code == 200
    bullet_data = bullet_res.json()
    assert "Facilitated" in bullet_data["suggested_bullet"] or "engineered" in bullet_data["suggested_bullet"].lower()
    assert "Docker" in bullet_data["suggested_bullet"]

    # 3. Create resume & job, run match, then fetch recommendations
    resume_id = client.post("/api/resume/create", headers=headers, json={
        "title": "Junior Python Dev",
        "structured_json": {
            "extracted_skills": [{"canonical_name": "Python", "evidence_level": "STRONG", "evidence_snippets": ["Built Python CLI"]}]
        }
    }).json()["id"]

    job_id = client.post("/api/job/analyze", headers=headers, json={
        "title": "Backend Cloud Engineer",
        "company": "SaaS Cloud",
        "raw_text": "Requirements:\n• Python\n• Docker\n• Kubernetes\n• AWS"
    }).json()["id"]

    analysis_id = client.post("/api/match/analyze", headers=headers, json={
        "resume_id": resume_id,
        "job_id": job_id
    }).json()["id"]

    # 4. Fetch recommendations for gaps
    recs_res = client.get(f"/api/recommendations/{analysis_id}", headers=headers)
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert len(recs) >= 3  # Docker, Kubernetes, AWS are gaps
    rec_skills = {r["skill_name"] for r in recs}
    assert "Docker" in rec_skills or "Kubernetes" in rec_skills

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.ai.matching_engine import calculate_match_metrics
from app.ai.gap_analyzer import analyze_skill_gaps
from app.ai.embedding_service import embedding_service

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

def test_semantic_embedding_service():
    sim1 = embedding_service.calculate_similarity(
        "FastAPI microservices with high throughput and low latency",
        "FastAPI REST API design and backend services"
    )
    assert sim1 > 0.10

    sim2 = embedding_service.calculate_similarity(
        "FastAPI microservices",
        "Cooking gourmet Italian pizza"
    )
    assert sim1 > sim2 * 3
    assert sim2 < 0.05



def test_matching_score_calculation():
    candidate_skills = [
        {
            "canonical_name": "Python",
            "evidence_level": "STRONG",
            "evidence_snippets": ["Architected backend services using Python"]
        },
        {
            "canonical_name": "FastAPI",
            "evidence_level": "STRONG",
            "evidence_snippets": ["Built RESTful APIs in FastAPI"]
        },
        {
            "canonical_name": "Docker",
            "evidence_level": "LISTED",
            "evidence_snippets": []
        }
    ]

    job_skills = [
        {"skill_id": "1", "canonical_name": "Python", "weight": 1.0, "importance": "REQUIRED"},
        {"skill_id": "2", "canonical_name": "FastAPI", "weight": 1.0, "importance": "REQUIRED"},
        {"skill_id": "3", "canonical_name": "Docker", "weight": 0.5, "importance": "PREFERRED"},
        {"skill_id": "4", "canonical_name": "Kubernetes", "weight": 1.0, "importance": "REQUIRED"}
    ]

    bullets = [
        "Architected backend services using Python and FastAPI.",
        "Deployed containerized apps."
    ]

    metrics = calculate_match_metrics(candidate_skills, job_skills, bullets)
    
    assert 0.0 <= metrics["overall_score"] <= 100.0
    assert metrics["matched_count"] == 3
    assert metrics["total_job_skills"] == 4
    assert "does not guarantee employment" in metrics["disclaimer"]

def test_gap_analyzer_classification():
    candidate_skills = [
        {
            "canonical_name": "Python",
            "evidence_level": "STRONG",
            "evidence_snippets": ["Engineered data pipelines in Python"]
        },
        {
            "canonical_name": "Docker",
            "evidence_level": "LISTED",
            "evidence_snippets": []
        }
    ]

    job_skills = [
        {"skill_id": "1", "canonical_name": "Python", "importance": "REQUIRED"},
        {"skill_id": "2", "canonical_name": "Docker", "importance": "REQUIRED"},
        {"skill_id": "3", "canonical_name": "Kubernetes", "importance": "REQUIRED"},
        {"skill_id": "4", "canonical_name": "GraphQL", "importance": "PREFERRED"}
    ]

    gaps = analyze_skill_gaps(candidate_skills, job_skills)
    gap_map = {g["canonical_name"]: g for g in gaps}

    # Python should be STRONG_MATCH
    assert gap_map["Python"]["gap_status"] == "STRONG_MATCH"
    
    # Docker should be WEAK_EVIDENCE (listed without bullet proof)
    assert gap_map["Docker"]["gap_status"] == "WEAK_EVIDENCE"
    assert gap_map["Docker"]["priority"] == "HIGH"
    
    # Kubernetes is missing and REQUIRED -> HIGH priority
    assert gap_map["Kubernetes"]["gap_status"] == "MISSING"
    assert gap_map["Kubernetes"]["priority"] == "HIGH"
    
    # GraphQL is missing and PREFERRED -> MEDIUM priority
    assert gap_map["GraphQL"]["gap_status"] == "MISSING"
    assert gap_map["GraphQL"]["priority"] == "MEDIUM"

def test_match_api_flow(test_client):
    client, _ = test_client

    # 1. Register & login
    client.post("/api/auth/register", json={
        "email": "cand@careertech.ai",
        "password": "Password123!",
        "full_name": "Test Candidate"
    })
    token = client.post("/api/auth/login", json={
        "email": "cand@careertech.ai",
        "password": "Password123!"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create resume
    resume_res = client.post("/api/resume/create", headers=headers, json={
        "title": "Full-Stack Dev Resume",
        "structured_json": {
            "extracted_skills": [
                {"canonical_name": "Python", "evidence_level": "STRONG", "evidence_snippets": ["Built Python APIs"]},
                {"canonical_name": "React", "evidence_level": "STRONG", "evidence_snippets": ["Developed UI in React"]}
            ]
        }
    })
    resume_id = resume_res.json()["id"]

    # 3. Create job
    job_res = client.post("/api/job/analyze", headers=headers, json={
        "title": "Full-Stack Software Engineer",
        "company": "NextEra Tech",
        "raw_text": "Requirements:\n• Experience with Python and React.\n• Knowledge of PostgreSQL.\n\nPreferred:\n• Familiarity with Docker."
    })
    job_id = job_res.json()["id"]

    # 4. Trigger match analysis
    match_res = client.post("/api/match/analyze", headers=headers, json={
        "resume_id": resume_id,
        "job_id": job_id
    })
    assert match_res.status_code == 201
    data = match_res.json()
    assert data["job_title"] == "Full-Stack Software Engineer"
    assert 0.0 < data["overall_score"] < 100.0
    assert len(data["gaps"]) >= 3
    analysis_id = data["id"]

    # 5. Retrieve analysis
    get_res = client.get(f"/api/match/{analysis_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == analysis_id

    # 6. List history
    hist_res = client.get("/api/match/history", headers=headers)
    assert hist_res.status_code == 200
    assert len(hist_res.json()) >= 1

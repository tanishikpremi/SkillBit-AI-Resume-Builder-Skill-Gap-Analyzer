import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.ai.llm_service import llm_service

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

def test_llm_provider_detection():
    info = llm_service.get_provider_info()
    assert "provider" in info
    assert "model" in info
    assert "name" in info
    # Default without keys is mock / local engine
    assert info["provider"] in ["mock", "groq", "gemini", "grok", "openai"]

def test_gap_insights_generation():
    insights = llm_service.generate_gap_insights(
        candidate_name="Alex Mercer",
        job_title="Senior Backend Cloud Engineer",
        company="NextEra Cloud",
        overall_score=68.5,
        matched_count=4,
        total_skills=6,
        gaps_list=[
            {"canonical_name": "Docker", "gap_status": "WEAK_EVIDENCE", "priority": "HIGH"},
            {"canonical_name": "Kubernetes", "gap_status": "MISSING", "priority": "HIGH"},
            {"canonical_name": "Python", "gap_status": "STRONG_MATCH", "priority": "LOW"}
        ]
    )

    assert "readiness_level" in insights
    assert "executive_summary" in insights
    assert "top_improvement_priorities" in insights
    assert "strategic_action_plan" in insights
    assert len(insights["top_improvement_priorities"]) >= 2
    assert len(insights["strategic_action_plan"]) >= 2
    assert "provider_used" in insights

def test_sequential_roadmap_structure():
    # 1. Curated skill (Python)
    python_roadmap = llm_service.generate_sequential_roadmap("Python")
    assert len(python_roadmap) == 4
    for idx, stage in enumerate(python_roadmap, start=1):
        assert stage["stage_number"] == idx
        assert "stage_title" in stage
        assert len(stage["topics_in_sequence"]) > 0
        assert "practice_milestone" in stage
        assert "doc_url" in stage

    # 2. Arbitrary / dynamic skill (Terraform)
    tf_roadmap = llm_service.generate_sequential_roadmap("Terraform", target_role="DevOps Engineer")
    assert len(tf_roadmap) == 4
    assert tf_roadmap[0]["stage_number"] == 1
    assert "Terraform" in tf_roadmap[0]["topics_in_sequence"][0]

def test_llm_endpoints_and_custom_roadmap(test_client):
    client, _ = test_client

    # 1. Register & login
    client.post("/api/auth/register", json={
        "email": "llm.tester@careertech.ai",
        "password": "Password123!",
        "full_name": "LLM Test User"
    })
    token = client.post("/api/auth/login", json={
        "email": "llm.tester@careertech.ai",
        "password": "Password123!"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test LLM provider status endpoint
    prov_res = client.get("/api/match/llm-provider")
    assert prov_res.status_code == 200
    assert "provider" in prov_res.json()

    # 3. Test on-demand custom roadmap generation
    custom_res = client.post("/api/recommendations/generate-roadmap", headers=headers, json={
        "skill_name": "GraphQL",
        "target_role": "Full-Stack Engineer",
        "candidate_level": "Intermediate"
    })
    assert custom_res.status_code == 200
    custom_data = custom_res.json()
    assert custom_data["skill_name"] == "GraphQL"
    assert custom_data["total_stages"] == 4
    assert len(custom_data["learning_path"]) == 4

    # 4. Test match analysis with automated AI insights
    resume_id = client.post("/api/resume/create", headers=headers, json={
        "title": "Cloud Dev Resume",
        "structured_json": {
            "extracted_skills": [{"canonical_name": "Python", "evidence_level": "STRONG", "evidence_snippets": ["Python microservices"]}]
        }
    }).json()["id"]

    job_id = client.post("/api/job/analyze", headers=headers, json={
        "title": "Backend SRE",
        "company": "Cloud Systems",
        "raw_text": "Requirements:\n• Python\n• Docker\n• Kubernetes"
    }).json()["id"]

    match_res = client.post("/api/match/analyze", headers=headers, json={
        "resume_id": resume_id,
        "job_id": job_id
    })
    assert match_res.status_code == 201
    analysis_data = match_res.json()
    assert "ai_insights" in analysis_data
    assert analysis_data["ai_insights"] is not None
    assert "executive_summary" in analysis_data["ai_insights"]

    # 5. Test refresh AI insights endpoint
    analysis_id = analysis_data["id"]
    refresh_res = client.post(f"/api/match/{analysis_id}/ai-insights", headers=headers)
    assert refresh_res.status_code == 200
    assert "executive_summary" in refresh_res.json()

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.ai.job_analyzer import analyze_job_requirements, detect_seniority_level

SAMPLE_JOB_TEXT = """
Role: Senior Backend Engineer
Company: CloudScale AI

About the Role:
We are looking for an experienced Senior Backend Engineer to lead our core data ingestion microservices.

Requirements:
• 5+ years of experience with Python and FastAPI or Django.
• Strong knowledge of relational databases like PostgreSQL.
• Experience with containerization using Docker and orchestration with Kubernetes.
• Solid foundation in RESTful APIs and System Design.

Preferred Qualifications:
• Familiarity with Apache Kafka or streaming systems.
• Experience with AWS or Google Cloud Platform.
• Exposure to machine learning model deployment.
"""

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

def test_seniority_detection():
    assert detect_seniority_level("Senior Backend Engineer", "text") == "Senior"
    assert detect_seniority_level("Lead Architect", "text") == "Lead"
    assert detect_seniority_level("Junior Developer", "text") == "Entry"
    assert detect_seniority_level("Software Engineer", "text") == "Mid"

def test_job_nlp_analysis(test_client):
    _, db = test_client
    analysis = analyze_job_requirements(SAMPLE_JOB_TEXT, "Senior Backend Engineer", db)
    
    assert analysis["seniority_level"] == "Senior"
    
    required_names = {s["canonical_name"] for s in analysis["required_skills"]}
    preferred_names = {s["canonical_name"] for s in analysis["preferred_skills"]}
    
    # Check Required skills
    assert "Python" in required_names
    assert "FastAPI" in required_names
    assert "PostgreSQL" in required_names
    assert "Docker" in required_names
    assert "Kubernetes" in required_names
    
    # Check Preferred skills
    assert "Apache Kafka" in preferred_names or "AWS" in preferred_names

def test_job_api_endpoints(test_client):
    client, _ = test_client
    
    # Register and login
    client.post("/api/auth/register", json={
        "email": "recruiter@careertech.ai",
        "password": "Password123!",
        "full_name": "Tech Recruiter"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "recruiter@careertech.ai",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Analyze Job
    res = client.post("/api/job/analyze", headers=headers, json={
        "title": "Senior Backend Engineer",
        "company": "CloudScale AI",
        "raw_text": SAMPLE_JOB_TEXT
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Senior Backend Engineer"
    assert data["seniority_level"] == "Senior"
    assert len(data["job_skills"]) >= 5
    job_id = data["id"]
    
    # Retrieve job
    get_res = client.get(f"/api/job/{job_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == job_id
    
    # List jobs
    list_res = client.get("/api/job", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

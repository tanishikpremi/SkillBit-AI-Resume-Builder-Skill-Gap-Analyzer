import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.services.pdf_service import build_ats_resume_pdf

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

def test_pdf_service_generation():
    resume_payload = {
        "title": "Software Engineer Resume",
        "full_name": "Devin Chen",
        "contact_info": {
            "email": "devin.chen@example.com",
            "phone": "(555) 987-6543",
            "location": "Seattle, WA",
            "linkedin": "linkedin.com/in/devinchen"
        },
        "summary": "Full-Stack Software Engineer with 5 years experience designing resilient APIs.",
        "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "AWS"],
        "experiences": [
            {
                "company": "Amazon AWS",
                "role_title": "Software Development Engineer",
                "start_date": "2021",
                "is_current": True,
                "bullets": [
                    "Designed scalable microservices processing 1M events daily.",
                    "Optimized DynamoDB access patterns, reducing latency by 35%."
                ]
            }
        ],
        "educations": [
            {
                "degree": "B.S. in Computer Science",
                "field_of_study": "Software Engineering",
                "institution": "University of Washington",
                "start_date": "2017",
                "end_date": "2021",
                "gpa": "3.85"
            }
        ],
        "projects": [
            {
                "title": "Distributed Task Scheduler",
                "technologies": ["Python", "Redis", "FastAPI"],
                "description": "High-throughput asynchronous background job scheduler."
            }
        ]
    }

    pdf_buffer = build_ats_resume_pdf(resume_payload)
    pdf_bytes = pdf_buffer.getvalue()
    
    assert len(pdf_bytes) > 1000
    # PDF files start with magic bytes %PDF-
    assert pdf_bytes.startswith(b"%PDF-")

def test_export_pdf_api_endpoint(test_client):
    client, _ = test_client

    # 1. Register & login
    client.post("/api/auth/register", json={
        "email": "pdf.user@careertech.ai",
        "password": "Password123!",
        "full_name": "Devin Chen"
    })
    token = client.post("/api/auth/login", json={
        "email": "pdf.user@careertech.ai",
        "password": "Password123!"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create resume
    resume_res = client.post("/api/resume/create", headers=headers, json={
        "title": "Devin Chen Resume",
        "structured_json": {
            "summary": "Full-stack engineer with expertise in Python & React.",
            "skills": ["Python", "React", "FastAPI"]
        }
    })
    resume_id = resume_res.json()["id"]

    # 3. Export PDF
    export_res = client.get(f"/api/resume/{resume_id}/export", headers=headers)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/pdf"
    assert "attachment" in export_res.headers["content-disposition"]
    assert export_res.content.startswith(b"%PDF-")

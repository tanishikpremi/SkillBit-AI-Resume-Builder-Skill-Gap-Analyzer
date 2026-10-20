import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.ai.resume_parser import clean_extracted_text
from app.ai.section_classifier import classify_resume_sections
from app.ai.skill_extractor import extract_resume_skill_profile

SAMPLE_RESUME_TEXT = """
Alex Mercer
alex.mercer@gmail.com | (555) 123-4567 | linkedin.com/in/alexmercer | github.com/alexmercer
San Francisco, CA

PROFESSIONAL SUMMARY
Senior Full-Stack AI Engineer with 6+ years of experience designing high-throughput REST APIs and scalable distributed systems using Python and React.

WORK EXPERIENCE
Lead Software Engineer | Apex Cloud Solutions | 2021 - Present
• Architected and deployed microservices using FastAPI, Docker, and PostgreSQL handling 50k requests/min.
• Automated CI/CD deployment pipelines with GitHub Actions and Kubernetes, reducing release cycle time by 40%.
• Optimized database queries in PostgreSQL, improving response latency by 25%.

Software Developer | NextGen Media | 2018 - 2021
• Developed responsive single-page web applications with React, TypeScript, and Redux.
• Built backend RESTful APIs using Python, Flask, and MongoDB.

EDUCATION
B.S. in Computer Science | University of California, Berkeley | 2014 - 2018

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, SQL, Bash
Frameworks: React, FastAPI, Django, Flask, Express.js
Databases & Cloud: PostgreSQL, MongoDB, Redis, AWS, Docker, Kubernetes
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

def test_text_cleaning():
    messy_text = "• First bullet point\n\u2022 Second with un- \n wrapped hyphenation\n\n\n\n   Lots of spaces   "
    cleaned = clean_extracted_text(messy_text)
    assert "unwrapped" in cleaned
    assert "• Second with unwrapped hyphenation" in cleaned

def test_section_classification():
    sections = classify_resume_sections(SAMPLE_RESUME_TEXT)
    
    # Check contact extraction
    contact = sections["contact_info"]
    assert contact["email"] == "alex.mercer@gmail.com"
    assert "555" in contact["phone"]
    assert "linkedin.com/in/alexmercer" in contact["linkedin"]
    assert "github.com/alexmercer" in contact["github"]
    
    # Check section blocks
    assert "Senior Full-Stack AI Engineer" in sections["summary"]
    assert "FastAPI" in sections["experience_text"]
    assert "Berkeley" in sections["education_text"]
    assert "Docker" in sections["skills_text"]

def test_skill_extraction_and_evidence(test_client):
    client, db = test_client
    sections = classify_resume_sections(SAMPLE_RESUME_TEXT)
    skills = extract_resume_skill_profile(sections, db)
    
    extracted_names = {s["canonical_name"] for s in skills}
    assert "Python" in extracted_names
    assert "FastAPI" in extracted_names
    assert "Docker" in extracted_names
    assert "React" in extracted_names
    assert "PostgreSQL" in extracted_names
    assert "Kubernetes" in extracted_names
    
    # Verify evidence level for FastAPI (used with action verb 'Architected and deployed')
    fastapi_skill = next(s for s in skills if s["canonical_name"] == "FastAPI")
    assert fastapi_skill["evidence_level"] in ["STRONG", "MODERATE"]
    assert len(fastapi_skill["evidence_snippets"]) > 0

def test_resume_upload_and_create_api(test_client):
    client, _ = test_client
    
    # 1. Register user
    client.post("/api/auth/register", json={
        "email": "alex.mercer@example.com",
        "password": "Password123!",
        "full_name": "Alex Mercer"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "alex.mercer@example.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Upload resume as text file
    file_bytes = io.BytesIO(SAMPLE_RESUME_TEXT.encode("utf-8"))
    upload_res = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("alex_mercer_resume.txt", file_bytes, "text/plain")}
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["source_type"] == "uploaded"
    assert upload_data["ats_score"] > 60
    assert len(upload_data["extracted_skills"]) > 5
    
    resume_id = upload_data["id"]
    
    # 3. Retrieve resume
    get_res = client.get(f"/api/resume/{resume_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == resume_id
    
    # 4. Create builder resume
    builder_res = client.post(
        "/api/resume/create",
        headers=headers,
        json={
            "title": "ATS Tailored Profile",
            "structured_json": {
                "summary": "Targeted full-stack resume",
                "skills": ["Python", "FastAPI", "React"]
            }
        }
    )
    assert builder_res.status_code == 201
    assert builder_res.json()["source_type"] == "builder"
    
    # 5. List all resumes for user
    list_res = client.get("/api/resume", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 2

    # 6. Verify auto-generated profile and exact match detection
    assert "generated_profile" in upload_data
    assert upload_data["is_exact_profile_match"] is False
    assert len(upload_data["generated_profile"]["experiences"]) >= 2
    assert len(upload_data["generated_profile"]["educations"]) >= 1

    # Save extracted profile as active profile
    sync_res = client.post(
        f"/api/profile/sync-from-resume?resume_id={resume_id}&replace=true&profile_title=Alex+Mercer+Profile",
        headers=headers
    )
    assert sync_res.status_code == 200
    synced_prof = sync_res.json()
    assert len(synced_prof["experiences"]) >= 2
    assert len(synced_prof["educations"]) >= 1
    assert len(synced_prof["user_skills"]) >= 5

    # Upload identical resume again -> should detect exact existing profile with no changes
    dup_bytes = io.BytesIO(SAMPLE_RESUME_TEXT.encode("utf-8"))
    dup_res = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("alex_mercer_copy.txt", dup_bytes, "text/plain")}
    )
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["is_exact_profile_match"] is True
    assert dup_data["existing_resume_id"] == resume_id
    assert "Exact existing profile found" in dup_data["profile_match_message"]

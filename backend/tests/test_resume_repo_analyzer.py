import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.api.resume import _parse_github_url
from app.ai.resume_content_generator import generate_star_bullet_suggestions
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

def test_parse_github_url():
    owner, repo = _parse_github_url("https://github.com/fastapi/fastapi")
    assert owner == "fastapi"
    assert repo == "fastapi"

    owner2, repo2 = _parse_github_url("https://github.com/facebook/react.git")
    assert owner2 == "facebook"
    assert repo2 == "react"

    owner3, repo3 = _parse_github_url("owner/my-cool-project/")
    assert owner3 == "owner"
    assert repo3 == "my-cool-project"

def test_empty_star_bullet_generation():
    # Empty input should not fail but generate a starter STAR bullet
    res = generate_star_bullet_suggestions(
        raw_bullet="",
        target_skill="Python",
        context="Backend Engineer"
    )
    assert res["is_editable"] is True
    assert "Python" in res["suggested_bullet"]
    assert "STAR" in res["methodology"]

def test_pdf_export_with_clickable_links():
    resume_payload = {
        "title": "Software Engineer Resume",
        "full_name": "Alex Developer",
        "contact_info": {
            "email": "alex@example.com",
            "phone": "(555) 019-2834",
            "location": "Seattle, WA",
            "linkedin": "https://linkedin.com/in/alex-dev",
            "github": "https://github.com/alex-dev"
        },
        "summary": "Experienced full-stack engineer building scalable web services.",
        "skills": ["Python", "React", "Docker"],
        "experiences": [
            {
                "role_title": "Senior Engineer",
                "company": "Tech Corp",
                "start_date": "2022",
                "end_date": "Present",
                "is_current": True,
                "bullets": ["Architected microservices handling 50k req/min with 99.99% uptime."]
            }
        ],
        "projects": [
            {
                "title": "Cloud Stream Engine",
                "technologies": ["Python", "Kafka"],
                "repo_url": "https://github.com/alex-dev/stream-engine",
                "bullets": ["Engineered high-throughput event streamer with backpressure handling."]
            }
        ]
    }
    pdf_buffer = build_ats_resume_pdf(resume_payload)
    pdf_bytes = pdf_buffer.getvalue()
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_auto_format_resume_and_styled_pdf_tables(test_client):
    client, _ = test_client

    client.post("/api/auth/register", json={
        "email": "formatter@careertech.ai",
        "password": "Password123!",
        "full_name": "Format Tester"
    })
    token = client.post("/api/auth/login", json={
        "email": "formatter@careertech.ai",
        "password": "Password123!"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    messy_payload = {
        "structured_json": {
            "full_name": "ALEX MERCER",
            "designation": "senior backend engineer",
            "contact_info": {"phone": "5551234567", "email": "ALEX@EXAMPLE.COM"},
            "skills": ["python", "fastapi", "postgresql", "docker", "react.js"],
            "experiences": [
                {
                    "company": "acme cloud",
                    "role_title": "software engineer",
                    "start_date": "2022",
                    "end_date": "present",
                    "bullets": ["worked on microservices reducing latency by 35% and handling 40k req/min"]
                }
            ],
            "custom_tables": [
                {
                    "title": "Engineering Benchmarks",
                    "headers": ["Service", "Stack", "Impact"],
                    "rows": [["Auth Gateway", "**FastAPI** + *Redis*", "__99.99% uptime__"]]
                }
            ],
            "style_settings": {
                "font_family": "serif",
                "font_size": "compact",
                "line_spacing": "tight",
                "accent_color": "#6D28D9",
                "skills_display_mode": "table"
            }
        }
    }

    fmt_res = client.post("/api/resume/auto-format", headers=headers, json=messy_payload)
    assert fmt_res.status_code == 200
    fmt_data = fmt_res.json()
    cleaned = fmt_data["structured_json"]
    assert cleaned["full_name"] == "Alex Mercer"
    assert cleaned["contact_info"]["phone"] == "(555) 123-4567"
    assert len(cleaned["skill_categories"]) >= 2
    assert len(fmt_data["fixes_applied"]) >= 2

    # Verify PDF export with custom tables, table-mode skills, serif font, custom color, and rich text
    pdf_buf = build_ats_resume_pdf(cleaned)
    assert pdf_buf.getvalue().startswith(b"%PDF")


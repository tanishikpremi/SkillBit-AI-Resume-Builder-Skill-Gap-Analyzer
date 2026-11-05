import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.services.json_ld_extractor import (
    clean_html_description,
    find_job_posting_in_data,
    extract_job_posting_from_json_ld,
)

# ---------------------------------------------------------------------------
# Sample Mock HTML Payloads
# ---------------------------------------------------------------------------

SAMPLE_DIRECT_JSON_LD = """
<!DOCTYPE html>
<html>
<head>
    <title>Senior Python Developer at TechCorp</title>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Senior Python Developer",
        "description": "<p>We are hiring a <strong>Senior Python Developer</strong>.</p><ul><li>5+ years of Python &amp; FastAPI experience</li><li>PostgreSQL &amp; Docker mastery</li></ul>",
        "hiringOrganization": {
            "@type": "Organization",
            "name": "TechCorp Global Inc"
        }
    }
    </script>
</head>
<body>
    <h1>Career Page</h1>
</body>
</html>
"""

SAMPLE_GRAPH_JSON_LD = """
<!DOCTYPE html>
<html>
<head>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BreadcrumbList",
                "itemListElement": []
            },
            {
                "@type": "WebPage",
                "name": "Careers Page"
            },
            {
                "@type": "JobPosting",
                "title": "Staff Backend Architect",
                "description": "<div>Lead our distributed backend cloud architecture.<br>Experience with Kubernetes &amp; Kafka required.</div>",
                "hiringOrganization": {
                    "@type": "Organization",
                    "name": "Acrobatix Cloud Systems"
                }
            }
        ]
    }
    </script>
</head>
<body></body>
</html>
"""

SAMPLE_STRING_ORG_JSON_LD = """
<html>
<head>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Machine Learning Engineer",
        "description": "Build state of the art LLM fine-tuning pipelines.",
        "hiringOrganization": "NeuroForge Labs"
    }
    </script>
</head>
</html>
"""

SAMPLE_MALFORMED_JSON_LD = """
<html>
<head>
    <!-- Malformed script 1 -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "title": "Broken Json",,
    }
    </script>
    <!-- Valid script 2 -->
    <script type="application/ld+json">
    <![CDATA[
    {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "DevOps Specialist",
        "description": "<p>Manage multi-region Terraform infrastructure.</p>",
        "hiringOrganization": {
            "name": "InfraStack Solutions"
        }
    }
    ]]>
    </script>
</head>
</html>
"""

SAMPLE_NO_JOB_POSTING_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Blog Post</title>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "10 Tips for Software Engineers"
    }
    </script>
</head>
<body>
    <p>General blog content without any job posting schema.</p>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Unit Tests for JSON-LD Extractor Service
# ---------------------------------------------------------------------------

def test_clean_html_description():
    raw_html = "<p>Join our team &amp; build the future!</p><ul><li>Python &bull; FastAPI</li><li>Remote &nbsp; Worldwide</li></ul>"
    cleaned = clean_html_description(raw_html)
    assert "&amp;" not in cleaned
    assert "&nbsp;" not in cleaned
    assert "Join our team & build the future!" in cleaned
    assert "• Python • FastAPI" in cleaned
    assert "<p>" not in cleaned


def test_extract_direct_job_posting():
    res = extract_job_posting_from_json_ld(SAMPLE_DIRECT_JSON_LD)
    assert res["found"] is True
    assert res["job_role"] == "Senior Python Developer"
    assert res["company_name"] == "TechCorp Global Inc"
    assert "5+ years of Python & FastAPI experience" in res["job_description"]
    assert "PostgreSQL & Docker mastery" in res["job_description"]


def test_extract_graph_nested_job_posting():
    res = extract_job_posting_from_json_ld(SAMPLE_GRAPH_JSON_LD)
    assert res["found"] is True
    assert res["job_role"] == "Staff Backend Architect"
    assert res["company_name"] == "Acrobatix Cloud Systems"
    assert "Kubernetes & Kafka required" in res["job_description"]


def test_extract_string_organization():
    res = extract_job_posting_from_json_ld(SAMPLE_STRING_ORG_JSON_LD)
    assert res["found"] is True
    assert res["job_role"] == "Machine Learning Engineer"
    assert res["company_name"] == "NeuroForge Labs"
    assert "LLM fine-tuning" in res["job_description"]


def test_extract_malformed_json_and_cdata_recovery():
    res = extract_job_posting_from_json_ld(SAMPLE_MALFORMED_JSON_LD)
    assert res["found"] is True
    assert res["job_role"] == "DevOps Specialist"
    assert res["company_name"] == "InfraStack Solutions"
    assert "Terraform infrastructure" in res["job_description"]


def test_extract_fallback_when_no_job_posting():
    res = extract_job_posting_from_json_ld(SAMPLE_NO_JOB_POSTING_HTML)
    assert res["found"] is False
    assert res["job_role"] is None
    assert res["company_name"] is None
    assert res["job_description"] is None
    assert "unavailable" in res["message"].lower() or "no schema.org" in res["message"].lower()


def test_extract_fallback_on_empty_content():
    res = extract_job_posting_from_json_ld("")
    assert res["found"] is False
    assert res["job_role"] is None
    assert "empty" in res["message"].lower()


# ---------------------------------------------------------------------------
# API Integration Tests with TestClient
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def api_test_client():
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
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_extract_url_api_success(api_test_client):
    # Register/login demo user
    api_test_client.post("/api/auth/register", json={
        "email": "jsonld_tester@careertech.ai",
        "password": "Password123!",
        "full_name": "JSON-LD Tester"
    })
    login_res = api_test_client.post("/api/auth/login", json={
        "email": "jsonld_tester@careertech.ai",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Mock httpx.Client.get returning SAMPLE_DIRECT_JSON_LD
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = SAMPLE_DIRECT_JSON_LD
    mock_resp.headers = {"content-type": "text/html"}

    with patch("httpx.Client.get", return_value=mock_resp):
        res = api_test_client.post(
            "/api/job/extract-url",
            headers=headers,
            json={"url": "https://boards.greenhouse.io/techcorp/jobs/123456"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["title"] == "Senior Python Developer"
        assert data["job_role"] == "Senior Python Developer"
        assert data["company"] == "TechCorp Global Inc"
        assert data["company_name"] == "TechCorp Global Inc"
        assert "FastAPI" in data["raw_text"]
        assert "FastAPI" in data["job_description"]
        assert data["json_ld_found"] is True
        assert data["skills_detected_count"] >= 1


def test_extract_json_ld_direct_api_success(api_test_client):
    login_res = api_test_client.post("/api/auth/login", json={
        "email": "jsonld_tester@careertech.ai",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = SAMPLE_GRAPH_JSON_LD
    mock_resp.headers = {"content-type": "text/html"}

    with patch("httpx.Client.get", return_value=mock_resp):
        res = api_test_client.post(
            "/api/job/extract-json-ld",
            headers=headers,
            json={"url": "https://jobs.lever.co/acrobatix/789"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["job_role"] == "Staff Backend Architect"
        assert data["company_name"] == "Acrobatix Cloud Systems"
        assert "Kubernetes & Kafka" in data["job_description"]


def test_extract_url_api_fallback_when_unavailable(api_test_client):
    login_res = api_test_client.post("/api/auth/login", json={
        "email": "jsonld_tester@careertech.ai",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = SAMPLE_NO_JOB_POSTING_HTML
    mock_resp.headers = {"content-type": "text/html"}

    with patch("httpx.Client.get", return_value=mock_resp):
        res = api_test_client.post(
            "/api/job/extract-url",
            headers=headers,
            json={"url": "https://company.example.com/blog/article"}
        )
        # Should return clear 400 error instructing to paste directly
        assert res.status_code == 400
        detail = res.json()["detail"].lower()
        assert "no schema.org 'jobposting'" in detail
        assert "paste" in detail


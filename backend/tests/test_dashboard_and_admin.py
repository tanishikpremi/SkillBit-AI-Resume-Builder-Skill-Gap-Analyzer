import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db

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

def test_dashboard_metrics_endpoint(test_client):
    client, _ = test_client

    # 1. Register candidate
    client.post("/api/auth/register", json={
        "email": "dash.user@careertech.ai",
        "password": "Password123!",
        "full_name": "Dash User"
    })
    token = client.post("/api/auth/login", json={
        "email": "dash.user@careertech.ai",
        "password": "Password123!"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update profile
    client.put("/api/profile", headers=headers, json={
        "headline": "Full-Stack Engineer",
        "summary": "Building scalable cloud systems.",
        "location": "Boston, MA"
    })

    # 3. Fetch dashboard
    dash_res = client.get("/api/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["user_name"] == "Dash User"
    assert dash_data["resume_completeness_pct"] > 0
    assert len(dash_data["quality_indicators"]) >= 2

def test_admin_and_placement_metrics(test_client):
    client, _ = test_client

    # 1. Login as default admin
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@careertech.ai",
        "password": "AdminPass123!"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Fetch cohort metrics
    metrics_res = client.get("/api/admin/metrics", headers=admin_headers)
    assert metrics_res.status_code == 200
    data = metrics_res.json()
    assert "cohort_overview" in data
    assert data["cohort_overview"]["total_candidates"] >= 1
    assert "placement_insights" in data

    # 3. Create new skill via Admin
    new_skill_res = client.post("/api/admin/skills", headers=admin_headers, json={
        "canonical_name": "Zig Programming",
        "category": "Programming Languages",
        "description": "General-purpose systems programming language.",
        "aliases": ["zig", "ziglang"]
    })
    assert new_skill_res.status_code == 201
    created_skill = new_skill_res.json()
    assert created_skill["canonical_name"] == "Zig Programming"
    skill_id = created_skill["id"]

    # 4. Delete skill via Admin
    del_res = client.delete(f"/api/admin/skills/{skill_id}", headers=admin_headers)
    assert del_res.status_code == 204

def test_admin_security_authorization(test_client):
    client, _ = test_client

    # Login as normal user
    token = client.post("/api/auth/login", json={
        "email": "dash.user@careertech.ai",
        "password": "Password123!"
    }).json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # Non-admin attempting to access admin endpoints must receive 403 Forbidden
    forbidden_res = client.get("/api/admin/metrics", headers=user_headers)
    assert forbidden_res.status_code == 403

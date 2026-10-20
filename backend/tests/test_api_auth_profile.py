import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="module")
def test_client():
    engine = create_engine(
        TEST_DATABASE_URL,
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

def test_health_check(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_register_and_login_flow(test_client):
    # 1. Register
    reg_payload = {
        "email": "sarah.connor@example.com",
        "password": "Resistance2026!",
        "full_name": "Sarah Connor"
    }
    reg_res = test_client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["email"] == "sarah.connor@example.com"
    assert data["full_name"] == "Sarah Connor"
    assert "id" in data

    # 2. Login
    login_payload = {
        "email": "sarah.connor@example.com",
        "password": "Resistance2026!"
    }
    login_res = test_client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]

    # 3. Get /me
    me_res = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "sarah.connor@example.com"

def test_profile_management_endpoints(test_client):
    # Login first
    login_res = test_client.post("/api/auth/login", json={
        "email": "sarah.connor@example.com",
        "password": "Resistance2026!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get initial profile
    prof_res = test_client.get("/api/profile", headers=headers)
    assert prof_res.status_code == 200
    profile = prof_res.json()
    assert profile["headline"] is None

    # 2. Update profile
    update_res = test_client.put("/api/profile", headers=headers, json={
        "headline": "Lead AI Systems Architect",
        "location": "Los Angeles, CA",
        "summary": "Specialist in autonomous software pipelines and cyber-resilience."
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["headline"] == "Lead AI Systems Architect"
    assert updated["location"] == "Los Angeles, CA"

    # 3. Add Experience
    exp_res = test_client.post("/api/profile/experience", headers=headers, json={
        "company": "Cyberdyne Solutions",
        "role_title": "Lead Software Engineer",
        "is_current": True,
        "bullets": ["Architected distributed NLP pipelines with 99.9% uptime"],
        "technologies": ["Python", "FastAPI", "Docker"]
    })
    assert exp_res.status_code == 201
    exp_data = exp_res.json()
    assert exp_data["company"] == "Cyberdyne Solutions"
    exp_id = exp_data["id"]

    # 4. Check profile reflects added experience
    prof_refreshed = test_client.get("/api/profile", headers=headers).json()
    assert len(prof_refreshed["experiences"]) == 1
    assert prof_refreshed["experiences"][0]["id"] == exp_id

    # 5. Delete experience
    del_res = test_client.delete(f"/api/profile/experience/{exp_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Verify experience deleted
    prof_after_del = test_client.get("/api/profile", headers=headers).json()
    assert len(prof_after_del["experiences"]) == 0

def test_skills_and_normalization_endpoints(test_client):
    # 1. Get canonical skills list
    skills_res = test_client.get("/api/skills?limit=10")
    assert skills_res.status_code == 200
    skills = skills_res.json()
    assert len(skills) > 0

    # 2. Search skill
    search_res = test_client.get("/api/skills?query=react")
    assert search_res.status_code == 200
    names = [s["canonical_name"] for s in search_res.json()]
    assert "React" in names or "React Native" in names

    # 3. Test normalization endpoint
    norm_res = test_client.post("/api/skills/normalize", json=[
        "react.js",
        "postgres",
        "python programming",
        "docker containers"
    ])
    assert norm_res.status_code == 200
    normalized = norm_res.json()
    norm_map = {item["original_text"]: item["canonical_name"] for item in normalized}
    
    assert norm_map.get("react.js") == "React"
    assert norm_map.get("postgres") == "PostgreSQL"
    assert norm_map.get("python programming") == "Python"
    assert norm_map.get("docker containers") == "Docker"

def test_google_login_auto_provisioning(test_client):
    # 1. Test auto-provisioning a new Google user without manual signup
    google_payload = {
        "email": "google.user@example.com",
        "full_name": "Google Test User",
        "picture": "https://example.com/avatar.png"
    }
    resp = test_client.post("/api/auth/google", json=google_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["email"] == "google.user@example.com"
    assert data["full_name"] == "Google Test User"
    assert data["picture"] == "https://example.com/avatar.png"
    token = data["access_token"]

    # 2. Verify protected profile access works immediately
    headers = {"Authorization": f"Bearer {token}"}
    prof_resp = test_client.get("/api/profile", headers=headers)
    assert prof_resp.status_code == 200
    assert prof_resp.json()["user_id"] == data["user_id"]


import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.session import Base, get_db
from app.database.init_db import init_db
from app.models.user import User

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
    assert data["is_verified"] is True
    token = data["access_token"]

    # 2. Verify protected profile access works immediately
    headers = {"Authorization": f"Bearer {token}"}
    prof_resp = test_client.get("/api/profile", headers=headers)
    assert prof_resp.status_code == 200
    assert prof_resp.json()["user_id"] == data["user_id"]

def test_email_verification_flow(test_client):
    # 1. Register a new non-demo user
    reg_payload = {
        "email": "alex.novak@example.com",
        "password": "SecurePassword123!",
        "full_name": "Alex Novak"
    }
    reg_res = test_client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["is_verified"] is False
    assert "Registration" in reg_data.get("message", "")

    # 2. Attempt login before verification -> Should fail with 403 Forbidden
    login_payload = {
        "email": "alex.novak@example.com",
        "password": "SecurePassword123!"
    }
    fail_login = test_client.post("/api/auth/login", json=login_payload)
    assert fail_login.status_code == 403
    assert "verify your email" in fail_login.json()["detail"].lower()

    # 3. Retrieve user from db to get verification token
    db_gen = test_client.app.dependency_overrides[get_db]()
    db = next(db_gen)
    user = db.query(User).filter(User.email == "alex.novak@example.com").first()
    assert user is not None
    assert user.verification_token is not None
    token = user.verification_token
    db.close()

    # 4. Verify email using the token
    verify_res = test_client.post("/api/auth/verify-email", json={"token": token})
    assert verify_res.status_code == 200
    token_data = verify_res.json()
    assert "access_token" in token_data
    assert token_data["is_verified"] is True
    assert token_data["email"] == "alex.novak@example.com"

    # 5. Now login succeeds
    success_login = test_client.post("/api/auth/login", json=login_payload)
    assert success_login.status_code == 200
    assert "access_token" in success_login.json()

def test_resend_verification_endpoint(test_client):
    # 1. Register another user
    reg_res = test_client.post("/api/auth/register", json={
        "email": "jane.smith@example.com",
        "password": "Password987!",
        "full_name": "Jane Smith"
    })
    assert reg_res.status_code == 201

    # Immediate resend triggers 60s rate limit (429)
    resend_too_soon = test_client.post("/api/auth/resend-verification", json={
        "email": "jane.smith@example.com"
    })
    assert resend_too_soon.status_code == 429

    # Advance cooldown in DB
    db_gen = test_client.app.dependency_overrides[get_db]()
    db = next(db_gen)
    user = db.query(User).filter(User.email == "jane.smith@example.com").first()
    user.last_verification_sent_at = datetime.utcnow() - timedelta(seconds=70)
    db.commit()
    db.close()

    # 2. Resend verification now succeeds
    resend_res = test_client.post("/api/auth/resend-verification", json={
        "email": "jane.smith@example.com"
    })
    assert resend_res.status_code == 200
    assert "sent" in resend_res.json()["message"].lower()

    # 3. Verify with the new OTP
    db_gen = test_client.app.dependency_overrides[get_db]()
    db = next(db_gen)
    user = db.query(User).filter(User.email == "jane.smith@example.com").first()
    otp_code = user.verification_otp
    new_token = user.verification_token
    db.close()

    # Verify OTP endpoint
    verify_otp_res = test_client.post("/api/auth/verify-otp", json={
        "email": "jane.smith@example.com",
        "otp": otp_code
    })
    assert verify_otp_res.status_code == 200
    assert verify_otp_res.json()["email"] == "jane.smith@example.com"
    assert verify_otp_res.json()["is_verified"] is True

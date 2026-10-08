import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.session import Base
from app.models import User, Profile, Skill, SkillAlias, Education, Experience, Project, UserSkill
from app.utils.taxonomy_data import CANONICAL_SKILLS
from app.database.init_db import init_db
from app.utils.security import get_password_hash, verify_password, create_access_token, decode_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    # Run init seeder on in-memory DB
    init_db(db=db)
    
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_taxonomy_seeding(db_session):
    skill_count = db_session.query(Skill).count()
    alias_count = db_session.query(SkillAlias).count()
    
    assert skill_count == len(CANONICAL_SKILLS)
    assert alias_count >= len(CANONICAL_SKILLS)  # Each skill has at least 1 alias (itself)
    
    # Test specific canonical skills exist
    python_skill = db_session.query(Skill).filter(Skill.canonical_name == "Python").first()
    assert python_skill is not None
    assert python_skill.category == "Programming Languages"
    
    react_skill = db_session.query(Skill).filter(Skill.canonical_name == "React").first()
    assert react_skill is not None
    assert react_skill.category == "Frameworks"

def test_skill_normalization_and_aliases(db_session):
    # Test alias resolution
    react_alias = db_session.query(SkillAlias).filter(SkillAlias.alias_name == "react.js").first()
    assert react_alias is not None
    assert react_alias.skill.canonical_name == "React"

    postgres_alias = db_session.query(SkillAlias).filter(SkillAlias.alias_name == "postgres").first()
    assert postgres_alias is not None
    assert postgres_alias.skill.canonical_name == "PostgreSQL"

    # Distinctness check: Java vs JavaScript
    java_skill = db_session.query(Skill).filter(Skill.canonical_name == "Java").first()
    js_skill = db_session.query(Skill).filter(Skill.canonical_name == "JavaScript").first()
    assert java_skill.id != js_skill.id
    assert java_skill.canonical_name == "Java"
    assert js_skill.canonical_name == "JavaScript"

def test_security_and_password_hashing():
    raw_password = "SecurePassword2026!"
    hashed = get_password_hash(raw_password)
    
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_creation_and_decoding():
    user_id = "test-user-uuid-1234"
    extra = {"email": "test@careertech.ai", "role": "user"}
    token = create_access_token(subject=user_id, extra_claims=extra)
    
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    assert payload.get("email") == "test@careertech.ai"
    assert payload.get("role") == "user"

def test_user_and_profile_relationships(db_session):
    user = User(
        email="dev@careertech.ai",
        hashed_password=get_password_hash("DevPass123!"),
        full_name="Jane Doe",
        role="user"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = Profile(
        user_id=user.id,
        headline="Full Stack AI Engineer",
        summary="Experienced engineer with expertise in Python and React."
    )
    db_session.add(profile)
    db_session.commit()

    # Add experience
    exp = Experience(
        profile_id=profile.id,
        company="TechCorp",
        role_title="Senior Developer",
        is_current=True,
        bullets=["Designed scalable FastAPI microservices with 99.9% uptime"],
        technologies=["Python", "FastAPI", "PostgreSQL"]
    )
    db_session.add(exp)
    db_session.commit()

    # Query back
    fetched_user = db_session.query(User).filter(User.id == user.id).first()
    assert fetched_user.profile is not None
    assert fetched_user.profile.headline == "Full Stack AI Engineer"
    assert len(fetched_user.profile.experiences) == 1
    assert fetched_user.profile.experiences[0].company == "TechCorp"
    assert "FastAPI" in fetched_user.profile.experiences[0].technologies

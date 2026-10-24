import logging
from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models import Skill, SkillAlias, User, Profile, Resume
from app.utils.taxonomy_data import CANONICAL_SKILLS
import bcrypt

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def seed_demo_candidate(db: Session, email: str = "sarah.connor@example.com", password: str = "Resistance2026!", full_name: str = "Sarah Connor") -> User:
    """Provisions the default candidate demo user, profile, and starter ATS resume if not present."""
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        user = User(
            email=email.lower(),
            hashed_password=hash_password(password),
            full_name=full_name,
            role="user",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[SUCCESS] Seeded default candidate demo user: {email}")

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(
            user_id=user.id,
            headline="Full-Stack Cloud & AI Software Engineer",
            summary="Results-driven Software Engineer with 4+ years of experience architecting FastAPI microservices, modern React interfaces, and containerized cloud deployments.",
            phone="(555) 234-5678",
            location="San Francisco, CA",
            linkedin_url="https://linkedin.com/in/sarahconnor",
            github_url="https://github.com/sarahconnor"
        )
        db.add(profile)
        db.commit()

    existing_resume = db.query(Resume).filter(Resume.user_id == user.id).first()
    if not existing_resume:
        demo_skill_names = ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker", "Git"]
        extracted_skills = []
        for s_name in demo_skill_names:
            skill_obj = db.query(Skill).filter(Skill.canonical_name == s_name).first()
            if skill_obj:
                extracted_skills.append({
                    "skill_id": skill_obj.id,
                    "canonical_name": skill_obj.canonical_name,
                    "category": skill_obj.category,
                    "section": "experience",
                    "evidence_level": "STRONG" if s_name in ("Python", "FastAPI", "React", "PostgreSQL", "Docker") else "LISTED",
                    "evidence_snippets": [
                        f"Architected and deployed production services utilizing {skill_obj.canonical_name}, improving throughput by 35%."
                    ],
                    "mention_count": 2,
                    "sections_found": ["experience", "skills"]
                })

        structured_json = {
            "full_name": full_name,
            "contact_info": {
                "full_name": full_name,
                "email": email.lower(),
                "phone": "(555) 234-5678",
                "location": "San Francisco, CA",
                "linkedin": "https://linkedin.com/in/sarahconnor",
                "github": "https://github.com/sarahconnor"
            },
            "summary": "Results-driven Software Engineer with 4+ years of experience architecting FastAPI microservices, modern React interfaces, and containerized cloud deployments.",
            "skills": demo_skill_names,
            "extracted_skills": extracted_skills,
            "experiences": [
                {
                    "company": "CloudScale AI",
                    "role_title": "Senior Software Engineer",
                    "location": "San Francisco, CA",
                    "start_date": "2022",
                    "end_date": "Present",
                    "is_current": True,
                    "bullets": [
                        "Architected and deployed asynchronous microservices using Python, FastAPI, and Docker, handling 40k req/min with 99.9% uptime.",
                        "Optimized PostgreSQL query execution plans, reducing average endpoint latency by 35%."
                    ]
                }
            ],
            "educations": [
                {
                    "degree": "B.S. in Computer Science",
                    "field_of_study": "Software Engineering",
                    "institution": "University of California, Berkeley",
                    "start_date": "2018",
                    "end_date": "2022",
                    "gpa": "3.85"
                }
            ],
            "projects": [
                {
                    "title": "Real-Time Event Streaming Engine",
                    "technologies": ["Python", "FastAPI", "React", "Docker"],
                    "repo_url": "https://github.com/sarahconnor/stream-engine",
                    "live_url": "",
                    "bullets": [
                        "Engineered distributed event streaming pipeline processing 50k events/sec with automatic backpressure.",
                        "Built responsive React and TypeScript telemetry dashboard with live WebSocket health metrics."
                    ]
                }
            ]
        }

        resume = Resume(
            user_id=user.id,
            title="Sarah Connor - Full-Stack Engineer Resume",
            source_type="builder",
            raw_text="Sarah Connor\nSenior Software Engineer\nArchitected and deployed asynchronous microservices using Python, FastAPI, React, TypeScript, PostgreSQL, and Docker.",
            structured_json=structured_json,
            ats_score=88.0,
            is_active=True
        )
        db.add(resume)
        db.commit()

    return user

from sqlalchemy import inspect, text

def init_db(db: Session = None) -> None:
    # 1. Create all database tables
    Base.metadata.create_all(bind=engine)
    
    # 1b. Migrate new columns if upgrading existing SQLite DB
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            if "users" in inspector.get_table_names():
                cols = [c["name"] for c in inspector.get_columns("users")]
                if "google_id" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"))
                    conn.commit()
                if "picture" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN picture VARCHAR(500)"))
                    conn.commit()
            if "analysis_history" in inspector.get_table_names():
                cols = [c["name"] for c in inspector.get_columns("analysis_history")]
                if "ai_insights" not in cols:
                    conn.execute(text("ALTER TABLE analysis_history ADD COLUMN ai_insights JSON"))
                    conn.commit()
            if "recommendations" in inspector.get_table_names():
                cols = [c["name"] for c in inspector.get_columns("recommendations")]
                if "learning_path" not in cols:
                    conn.execute(text("ALTER TABLE recommendations ADD COLUMN learning_path JSON"))
                    conn.commit()
    except Exception as exc:
        logger.warning(f"Schema migration note: {exc}")
    
    close_db_later = False
    if db is None:
        db = SessionLocal()
        close_db_later = True
        
    try:
        # 2. Seed canonical skills if empty
        existing_skills_count = db.query(Skill).count()
        if existing_skills_count == 0:
            print("[INFO] Seeding canonical skill taxonomy into database...")
            for skill_info in CANONICAL_SKILLS:
                skill_obj = Skill(
                    canonical_name=skill_info["name"],
                    category=skill_info["category"],
                    description=skill_info.get("description", "")
                )
                db.add(skill_obj)
                db.flush()  # Flush to get skill_obj.id
                
                # Add self as an alias (lowercased)
                self_alias = SkillAlias(
                    skill_id=skill_obj.id,
                    alias_name=skill_info["name"].strip().lower()
                )
                db.add(self_alias)
                
                # Add all registered aliases
                for alias in skill_info.get("aliases", []):
                    clean_alias = alias.strip().lower()
                    if clean_alias != skill_info["name"].strip().lower():
                        alias_obj = SkillAlias(
                            skill_id=skill_obj.id,
                            alias_name=clean_alias
                        )
                        db.add(alias_obj)
            db.commit()
            print(f"[SUCCESS] Seeded {len(CANONICAL_SKILLS)} canonical skills and their aliases.")

        # 3. Seed default admin users if absent
        for admin_email in ["admin@skillbit.ai", "admin@careertech.ai"]:
            admin_user = db.query(User).filter(User.email == admin_email).first()
            if not admin_user:
                admin_user = User(
                    email=admin_email,
                    hashed_password=hash_password("AdminPass123!"),
                    full_name="SkillBit Administrator" if "skillbit" in admin_email else "System Administrator",
                    role="admin",
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print(f"[SUCCESS] Seeded default administrator user: {admin_email}")

        # 4. Seed default demo candidate users on application startup
        if close_db_later:
            seed_demo_candidate(db)
            seed_demo_candidate(
                db,
                email="demo@skillbit.ai",
                password="demo1234",
                full_name="Maya Chen"
            )

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database initialization failed: {e}")
        raise
    finally:
        if close_db_later:
            db.close()

if __name__ == "__main__":
    init_db()

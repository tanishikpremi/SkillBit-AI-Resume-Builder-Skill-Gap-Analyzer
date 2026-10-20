import logging
from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models import Skill, SkillAlias, User
from app.utils.taxonomy_data import CANONICAL_SKILLS
import bcrypt

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

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

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database initialization failed: {e}")
        raise
    finally:
        if close_db_later:
            db.close()

if __name__ == "__main__":
    init_db()

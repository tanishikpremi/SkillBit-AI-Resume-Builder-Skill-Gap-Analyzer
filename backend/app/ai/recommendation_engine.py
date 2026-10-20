from typing import Dict, List, Any

# Curated catalog of validated learning roadmaps, concepts, projects, and certifications
SKILL_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "Python": {
        "learning_topic": "Advanced Python & Asynchronous Systems",
        "concepts": ["Asyncio & Concurrency", "Metaclasses & Decorators", "Memory Profiling", "Type Hinting (PEP 484)"],
        "practice_project": "Build an asynchronous distributed web scraper and message queue consumer with backpressure handling.",
        "certification_name": "PCAP – Certified Associate in Python Programming",
        "resource_url": "https://docs.python.org/3/tutorial/"
    },
    "FastAPI": {
        "learning_topic": "Production-Grade High-Performance APIs with FastAPI",
        "concepts": ["Dependency Injection", "Pydantic V2 Schemas", "Background Tasks", "OAuth2 & JWT Security Middleware"],
        "practice_project": "Architect an enterprise microservice with async SQLAlchemy 2.0, Alembic migrations, Redis caching, and Pytest coverage.",
        "certification_name": "Certified FastAPI Specialist",
        "resource_url": "https://fastapi.tiangolo.com/"
    },
    "React": {
        "learning_topic": "Modern React Architecture & State Management",
        "concepts": ["React Server Components", "Custom Hooks", "Redux Toolkit / Zustand", "Performance Profiling & Memoization"],
        "practice_project": "Create a responsive real-time analytics dashboard with optimistic UI updates and WebSocket integration.",
        "certification_name": "Meta Certified Front-End Developer",
        "resource_url": "https://react.dev/"
    },
    "Docker": {
        "learning_topic": "Containerization & Multi-Stage Builds",
        "concepts": ["Multi-stage Dockerfiles", "Volume Management & Networking", "Docker Compose Orchestration", "Image Size & Security Optimization"],
        "practice_project": "Containerize a polyglot application (FastAPI backend + React frontend + PostgreSQL) with healthchecks and non-root users.",
        "certification_name": "Docker Certified Associate (DCA)",
        "resource_url": "https://docs.docker.com/get-started/"
    },
    "Kubernetes": {
        "learning_topic": "Kubernetes Container Orchestration & Scaling",
        "concepts": ["Deployments & Services", "Ingress Controllers", "Horizontal Pod Autoscaling (HPA)", "ConfigMaps & Secrets"],
        "practice_project": "Deploy a clustered microservices application onto a local Minikube or Kind cluster with automated rollbacks and zero-downtime rolling updates.",
        "certification_name": "Certified Kubernetes Application Developer (CKAD)",
        "resource_url": "https://kubernetes.io/docs/home/"
    },
    "PostgreSQL": {
        "learning_topic": "PostgreSQL Database Performance Tuning & Indexing",
        "concepts": ["B-Tree & GIN Indexing", "EXPLAIN ANALYZE Execution Plans", "Connection Pooling (PgBouncer)", "ACID Transactions & Isolation Levels"],
        "practice_project": "Benchmark and optimize slow complex JOIN queries on a million-row synthetic dataset using partial and composite indexes.",
        "certification_name": "PostgreSQL Associate Certification",
        "resource_url": "https://www.postgresql.org/docs/"
    },
    "AWS": {
        "learning_topic": "AWS Cloud Architecture & Serverless Computing",
        "concepts": ["IAM Roles & Least Privilege", "S3 Bucket Policies", "ECS/EKS Container Deployments", "Lambda & API Gateway"],
        "practice_project": "Design a serverless event-driven processing pipeline using S3 event notifications, Lambda, and DynamoDB.",
        "certification_name": "AWS Certified Solutions Architect – Associate",
        "resource_url": "https://aws.amazon.com/training/"
    },
    "Apache Kafka": {
        "learning_topic": "Event Streaming & Distributed Messaging with Kafka",
        "concepts": ["Topic Partitioning & Consumer Groups", "Exactly-Once Semantics", "Kafka Streams", "Schema Registry & Avro Serialization"],
        "practice_project": "Implement an event-driven telemetry stream with producer idempotency and dead-letter queue recovery.",
        "certification_name": "Confluent Certified Developer for Apache Kafka (CCDAK)",
        "resource_url": "https://kafka.apache.org/documentation/"
    },
    "TypeScript": {
        "learning_topic": "Advanced Type Systems & Enterprise TypeScript",
        "concepts": ["Generics & Conditional Types", "Utility Types & Mapped Types", "Strict Null Checks", "Monorepo Configuration"],
        "practice_project": "Convert a dynamic JavaScript SDK into a fully typed TypeScript library with auto-generated documentation.",
        "certification_name": "TypeScript Deep Dive Certification",
        "resource_url": "https://www.typescriptlang.org/docs/"
    },
    "Machine Learning": {
        "learning_topic": "Practical Machine Learning & Feature Engineering",
        "concepts": ["Cross-Validation Strategies", "Hyperparameter Optimization", "Ensemble Methods (XGBoost/LightGBM)", "Precision-Recall Tradeoffs"],
        "practice_project": "Build an end-to-end predictive model with data preprocessing, model selection, validation, and a FastAPI inference endpoint.",
        "certification_name": "Google Cloud Professional Machine Learning Engineer",
        "resource_url": "https://scikit-learn.org/stable/"
    }
}

DEFAULT_RECOMMENDATION = {
    "learning_topic": "Core Fundamentals & Industry Best Practices",
    "concepts": ["Architecture Patterns", "Clean Code Principles", "Testing & Debugging", "Integration Workflows"],
    "practice_project": "Implement a modular proof-of-concept demonstrating practical usage of this technology in an end-to-end scenario.",
    "certification_name": None,
    "resource_url": "https://developer.mozilla.org/"
}

from app.ai.llm_service import llm_service

def generate_recommendation_for_gap(
    skill_name: str,
    gap_status: str,
    importance: str,
    evidence_snippet: str = ""
) -> Dict[str, Any]:
    """
    Generates tailored, actionable recommendation for a specific detected gap.
    Adapts based on whether the skill was MISSING or merely WEAK_EVIDENCE.
    Includes sequential step-by-step roadmap stages.
    """
    base_info = SKILL_KNOWLEDGE_BASE.get(skill_name, DEFAULT_RECOMMENDATION)
    learning_path = llm_service.generate_sequential_roadmap(skill_name)
    
    if gap_status == "WEAK_EVIDENCE":
        bullet_advice = f"Strengthen your resume by rewriting your existing bullets to highlight quantifiable impact with {skill_name}, e.g.: 'Spearheaded implementation of {skill_name}, improving latency/efficiency by X%'."
        action_plan = f"You already have basic exposure to {skill_name}. Bridge this gap by adding metrics, architecture decisions, and business impact to your existing experience bullets."
    else:  # MISSING
        bullet_advice = f"After completing a hands-on project, add a bullet: 'Built and deployed a project utilizing {skill_name}, implementing {base_info['concepts'][0]}'."
        action_plan = f"{skill_name} is {importance.lower()} for this role. Complete the recommended practice project to showcase demonstrable competence on your GitHub and resume."

    return {
        "skill_name": skill_name,
        "learning_topic": f"{base_info['learning_topic']} ({skill_name})",
        "concepts": base_info["concepts"],
        "learning_path": learning_path,
        "practice_project": base_info["practice_project"],
        "certification_name": base_info["certification_name"],
        "suggested_resume_bullet": bullet_advice,
        "action_plan": action_plan,
        "resource_url": base_info["resource_url"]
    }


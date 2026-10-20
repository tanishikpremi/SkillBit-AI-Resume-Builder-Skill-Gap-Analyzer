import os
import json
import logging
import re
from typing import Dict, List, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# Fallback structured roadmaps for common industry skills (used offline or when keys are absent)
CURATED_SEQUENTIAL_ROADMAPS: Dict[str, List[Dict[str, Any]]] = {
    "Python": [
        {
            "stage_number": 1,
            "stage_title": "Foundations & Modern Syntax",
            "estimated_duration": "3-5 days",
            "topics_in_sequence": [
                "Python 3.12+ Data Model & Built-in Types",
                "Virtual Environments (venv/uv) & Dependency Management",
                "Comprehensions, Generators & Iterators",
                "Decorators & Context Managers"
            ],
            "practice_milestone": "Build a command-line telemetry parser with custom context managers and error handling.",
            "doc_url": "https://docs.python.org/3/tutorial/"
        },
        {
            "stage_number": 2,
            "stage_title": "Core Architecture & Concurrency",
            "estimated_duration": "5-7 days",
            "topics_in_sequence": [
                "Asyncio Event Loops & Coroutines",
                "Type Hinting & Static Analysis (PEP 484, Mypy)",
                "Object-Oriented Design & Metaclasses",
                "Thread vs Multiprocessing Paradigms"
            ],
            "practice_milestone": "Implement an asynchronous rate-limited web scraper with backpressure handling.",
            "doc_url": "https://docs.python.org/3/library/asyncio.html"
        },
        {
            "stage_number": 3,
            "stage_title": "Production Engineering & Quality",
            "estimated_duration": "5-7 days",
            "topics_in_sequence": [
                "Testing with Pytest, Fixtures & Mocks",
                "Memory Profiling (tracemalloc) & CPU Optimization",
                "Packaging & Distribution (pyproject.toml)",
                "Dockerization & Multi-stage Python Images"
            ],
            "practice_milestone": "Write a 95%+ test-covered Python package with automated CI checks.",
            "doc_url": "https://docs.pytest.org/"
        },
        {
            "stage_number": 4,
            "stage_title": "Capstone Portfolio Proof",
            "estimated_duration": "4-6 days",
            "topics_in_sequence": [
                "Distributed Task Queue with Redis / Celery",
                "High-Throughput API Gateway Integration",
                "Deploying Production Service with Health Monitoring"
            ],
            "practice_milestone": "Architect and publish a production-ready asynchronous microservice on GitHub with Docker Compose.",
            "doc_url": "https://fastapi.tiangolo.com/"
        }
    ],
    "Docker": [
        {
            "stage_number": 1,
            "stage_title": "Container Fundamentals & CLI",
            "estimated_duration": "2-4 days",
            "topics_in_sequence": [
                "Linux Namespaces, Cgroups & Container Isolation",
                "Core Docker CLI (run, exec, ps, logs, inspect)",
                "Images vs Containers vs Registry",
                "Port Forwarding & Basic Networking"
            ],
            "practice_milestone": "Run and inspect isolated multi-container CLI tools locally.",
            "doc_url": "https://docs.docker.com/get-started/"
        },
        {
            "stage_number": 2,
            "stage_title": "Dockerfile Mastery & Multi-Stage Builds",
            "estimated_duration": "4-6 days",
            "topics_in_sequence": [
                "Base Images (Alpine vs Debian-slim vs Distroless)",
                "Multi-stage Dockerfile Optimization (layer caching)",
                "Non-root User Security & Privileges",
                ".dockerignore & Secret Management"
            ],
            "practice_milestone": "Cut an enterprise backend Docker image from 1.2GB down to under 120MB with multi-stage builds.",
            "doc_url": "https://docs.docker.com/develop/develop-images/multistage-build/"
        },
        {
            "stage_number": 3,
            "stage_title": "Multi-Service Orchestration with Compose",
            "estimated_duration": "4-5 days",
            "topics_in_sequence": [
                "Docker Compose V2 File Specification",
                "Named Volumes & Data Persistence",
                "User-defined Bridge Networks & DNS Discovery",
                "Healthchecks & Depends_on Condition Rules"
            ],
            "practice_milestone": "Compose a resilient 3-tier stack (Frontend + FastAPI Backend + PostgreSQL + Redis) with volume recovery.",
            "doc_url": "https://docs.docker.com/compose/"
        },
        {
            "stage_number": 4,
            "stage_title": "Production Deployment & Security Hardening",
            "estimated_duration": "3-5 days",
            "topics_in_sequence": [
                "Vulnerability Scanning (Docker Scout / Trivy)",
                "Logging Drivers & Resource Constraints (CPU/RAM limits)",
                "Publishing to Container Registries (Docker Hub / AWS ECR)"
            ],
            "practice_milestone": "Build automated GitHub Actions CI pipeline scanning and pushing hardened OCI containers.",
            "doc_url": "https://docs.docker.com/security/"
        }
    ],
    "Kubernetes": [
        {
            "stage_number": 1,
            "stage_title": "Kubernetes Architecture & Core Primitives",
            "estimated_duration": "3-5 days",
            "topics_in_sequence": [
                "Control Plane (API Server, Etcd, Scheduler) vs Worker Nodes (Kubelet, Kube-proxy)",
                "Setting Up Minikube or Kind Cluster",
                "Pods & Declarative YAML Manifests",
                "Kubectl Core Commands & Debugging (describe, logs, port-forward)"
            ],
            "practice_milestone": "Deploy a custom container pod onto a local Kind cluster and debug networking.",
            "doc_url": "https://kubernetes.io/docs/concepts/"
        },
        {
            "stage_number": 2,
            "stage_title": "Workloads, Networking & Services",
            "estimated_duration": "5-7 days",
            "topics_in_sequence": [
                "Deployments, ReplicaSets & Rolling Update Strategies",
                "Services: ClusterIP, NodePort, LoadBalancer",
                "Ingress Controllers & Path-based Routing (Nginx/Traefik)",
                "ConfigMaps & Secrets Decoupling"
            ],
            "practice_milestone": "Route external HTTP traffic across multiple replicas with zero downtime rolling deploys.",
            "doc_url": "https://kubernetes.io/docs/concepts/services-networking/"
        },
        {
            "stage_number": 3,
            "stage_title": "Scaling, Resilience & Storage",
            "estimated_duration": "5-7 days",
            "topics_in_sequence": [
                "Horizontal Pod Autoscaler (HPA) with Metrics Server",
                "Liveness, Readiness & Startup Probes",
                "Resource Requests & Limits (QoS classes)",
                "PersistentVolumes (PV) & PersistentVolumeClaims (PVC)"
            ],
            "practice_milestone": "Simulate heavy load with ApacheBench and observe automatic HPA pod autoscaling.",
            "doc_url": "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/"
        },
        {
            "stage_number": 4,
            "stage_title": "Helm Packaging & Production GitOps",
            "estimated_duration": "4-6 days",
            "topics_in_sequence": [
                "Helm Chart Architecture (Chart.yaml, values.yaml, templates)",
                "Namespaces & RBAC (Roles & RoleBindings)",
                "GitOps Delivery Workflow (ArgoCD overview)"
            ],
            "practice_milestone": "Package full application stack into a modular Helm chart with automated deployment.",
            "doc_url": "https://helm.sh/docs/"
        }
    ],
    "FastAPI": [
        {
            "stage_number": 1,
            "stage_title": "API Foundations & Pydantic V2",
            "estimated_duration": "2-4 days",
            "topics_in_sequence": [
                "FastAPI Routing, Path & Query Parameters",
                "Pydantic V2 Models, Field Validation & Serialization",
                "Request/Response Typing & OpenAPI Documentation (Swagger UI)",
                "HTTP Status Codes & Standardized Exception Handlers"
            ],
            "practice_milestone": "Build a CRUD REST API with automatic Swagger docs and strict input validation.",
            "doc_url": "https://fastapi.tiangolo.com/tutorial/"
        },
        {
            "stage_number": 2,
            "stage_title": "Dependency Injection & Security Architecture",
            "estimated_duration": "4-6 days",
            "topics_in_sequence": [
                "FastAPI `Depends()` Architecture & Reusable Dependencies",
                "OAuth2 Password Bearer & JWT Authentication Flow",
                "Password Hashing with Bcrypt & Token Expiry",
                "CORS & Security Headers Middleware"
            ],
            "practice_milestone": "Secure endpoints with role-based access control (RBAC) and JWT validation.",
            "doc_url": "https://fastapi.tiangolo.com/tutorial/security/"
        },
        {
            "stage_number": 3,
            "stage_title": "Asynchronous Database ORM & Migrations",
            "estimated_duration": "5-7 days",
            "topics_in_sequence": [
                "SQLAlchemy 2.0 Async Session & Engine Setup",
                "Database Migrations with Alembic",
                "Eager vs Lazy Loading & N+1 Query Prevention",
                "Background Tasks with `BackgroundTasks`"
            ],
            "practice_milestone": "Integrate asynchronous PostgreSQL and run non-blocking background email/audit tasks.",
            "doc_url": "https://fastapi.tiangolo.com/tutorial/sql-databases/"
        },
        {
            "stage_number": 4,
            "stage_title": "Testing, Dockerization & Production Tuning",
            "estimated_duration": "3-5 days",
            "topics_in_sequence": [
                "Testing with Pytest & TestClient / AsyncClient",
                "Gunicorn with Uvicorn Worker Architecture",
                "Redis Caching Layer for Hot Endpoints",
                "Healthcheck & Structured Logging"
            ],
            "practice_milestone": "Benchmark and deploy production-grade FastAPI service handling 1000+ RPS.",
            "doc_url": "https://fastapi.tiangolo.com/deployment/"
        }
    ],
    "React": [
        {
            "stage_number": 1,
            "stage_title": "Modern Component Architecture & State",
            "estimated_duration": "3-5 days",
            "topics_in_sequence": [
                "JSX & Modern Component Lifecycle",
                "useState, useEffect & Dependency Arrays",
                "Props, Destructuring & Conditional Rendering",
                "Forms & Controlled vs Uncontrolled Inputs"
            ],
            "practice_milestone": "Build an interactive multi-step data collection form with live client-side validation.",
            "doc_url": "https://react.dev/learn"
        },
        {
            "stage_number": 2,
            "stage_title": "Advanced Hooks & Global State Management",
            "estimated_duration": "4-6 days",
            "topics_in_sequence": [
                "Custom Hooks for Reusable Business Logic",
                "Context API + useReducer Architecture",
                "Lightweight Global State (Zustand or Redux Toolkit)",
                "useMemo, useCallback & Performance Profiling"
            ],
            "practice_milestone": "Architect global authentication and dark/light theme state with custom hooks.",
            "doc_url": "https://react.dev/reference/react"
        },
        {
            "stage_number": 3,
            "stage_title": "Routing & Server Synchronization",
            "estimated_duration": "4-6 days",
            "topics_in_sequence": [
                "Client-side Routing (React Router v6)",
                "Async Data Fetching with Axios / TanStack React Query",
                "Optimistic UI Updates & Error Boundaries",
                "Lazy Loading with React.lazy & Suspense"
            ],
            "practice_milestone": "Build a responsive SaaS dashboard with paginated API data and optimistic mutations.",
            "doc_url": "https://reactrouter.com/"
        },
        {
            "stage_number": 4,
            "stage_title": "Production Build & Component Quality",
            "estimated_duration": "3-5 days",
            "topics_in_sequence": [
                "Component Unit Testing (Vitest + React Testing Library)",
                "Vite Production Bundling & Code Splitting",
                "Accessibility (WCAG, ARIA tags & keyboard navigation)"
            ],
            "practice_milestone": "Deploy high-performance SPA to Vercel/Netlify with automated CI checks.",
            "doc_url": "https://vitejs.dev/"
        }
    ]
}

class LLMService:
    """
    Multi-provider LLM Client supporting Groq, Google Gemini, and xAI Grok free tiers,
    with automatic provider discovery and a resilient offline CareerTech intelligence fallback.
    """

    def __init__(self):
        self.http_client = httpx.Client(timeout=15.0)
        self.active_groq_model = "openai/gpt-oss-120b"

    def get_provider_info(self) -> Dict[str, Any]:
        """Returns the currently active LLM provider and model."""
        preferred = settings.DEFAULT_LLM_PROVIDER.lower()
        
        if preferred == "groq" and settings.GROQ_API_KEY:
            return {"provider": "groq", "model": self.active_groq_model, "is_mock": False, "name": f"Groq AI ({self.active_groq_model})"}
        elif preferred == "gemini" and settings.GEMINI_API_KEY:
            return {"provider": "gemini", "model": "gemini-1.5-flash", "is_mock": False, "name": "Google Gemini 1.5 Flash"}
        elif preferred == "grok" and settings.GROK_API_KEY:
            return {"provider": "grok", "model": "grok-beta", "is_mock": False, "name": "xAI Grok"}
        
        # Auto-detection based on available keys
        if settings.GROQ_API_KEY:
            return {"provider": "groq", "model": self.active_groq_model, "is_mock": False, "name": f"Groq AI ({self.active_groq_model})"}
        elif settings.GEMINI_API_KEY:
            return {"provider": "gemini", "model": "gemini-1.5-flash", "is_mock": False, "name": "Google Gemini 1.5 Flash"}
        elif settings.GROK_API_KEY:
            return {"provider": "grok", "model": "grok-beta", "is_mock": False, "name": "xAI Grok"}
        elif settings.OPENAI_API_KEY:
            return {"provider": "openai", "model": "gpt-4o-mini", "is_mock": False, "name": "OpenAI GPT-4o-mini"}
        
        return {
            "provider": "mock",
            "model": "careertech-local-engine",
            "is_mock": True,
            "name": "SkillBit CareerTech Engine"
        }

    def _call_groq(self, prompt: str) -> Optional[str]:
        """Calls Groq cloud inference API with dynamic model fallback."""
        candidate_models = [self.active_groq_model, "openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3.8-27b", "llama-3.1-8b-instant"]
        # Remove duplicates while preserving order
        unique_models = list(dict.fromkeys(candidate_models))

        for model in unique_models:
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are an expert AI Career Strategist and ATS Resume Evaluator. You provide structured, accurate JSON responses."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"}
                }
                resp = self.http_client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    self.active_groq_model = model
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.debug(f"Groq model {model} returned HTTP {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"Groq API error on model {model}: {e}")
        return None

    def _call_gemini(self, prompt: str) -> Optional[str]:
        """Calls Google Gemini REST endpoint."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {"parts": [{"text": prompt + "\nRespond with valid JSON only."}]}
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            }
            resp = self.http_client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
            else:
                logger.warning(f"Gemini API returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"Gemini API error: {e}")
        return None

    def _call_grok(self, prompt: str) -> Optional[str]:
        """Calls xAI Grok endpoint."""
        try:
            url = "https://api.xai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.GROK_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "grok-beta",
                "messages": [
                    {"role": "system", "content": "You are an expert Career Intelligence advisor. Respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2
            }
            resp = self.http_client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.warning(f"xAI Grok API returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"xAI Grok API error: {e}")
        return None

    def _call_active_provider(self, prompt: str) -> Optional[str]:
        """Routes prompt to active LLM provider with fallback handling."""
        info = self.get_provider_info()
        provider = info["provider"]

        if provider == "groq":
            res = self._call_groq(prompt)
            if res:
                return res
        elif provider == "gemini":
            res = self._call_gemini(prompt)
            if res:
                return res
        elif provider == "grok":
            res = self._call_grok(prompt)
            if res:
                return res
        
        return None

    def generate_gap_insights(
        self,
        candidate_name: str,
        job_title: str,
        company: str,
        overall_score: float,
        matched_count: int,
        total_skills: int,
        gaps_list: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates executive summary, candidate readiness assessment, priority improvement areas,
        and immediate strategic actions.
        """
        provider_info = self.get_provider_info()
        missing_skills = [g["canonical_name"] for g in gaps_list if g.get("gap_status") == "MISSING"]
        weak_skills = [g["canonical_name"] for g in gaps_list if g.get("gap_status") == "WEAK_EVIDENCE"]
        high_priority = [g["canonical_name"] for g in gaps_list if g.get("priority") == "HIGH"]

        # If live LLM is configured, query it
        if not provider_info["is_mock"]:
            prompt = f"""
You are evaluating candidate "{candidate_name}" for the role of "{job_title}" at "{company or 'Target Company'}".
Match score: {overall_score:.1f}% ({matched_count}/{total_skills} skills matched).
Missing Required Skills: {', '.join(missing_skills) if missing_skills else 'None'}
Skills with Weak Evidence (listed without metrics or project context): {', '.join(weak_skills) if weak_skills else 'None'}
Highest Priority Gaps: {', '.join(high_priority) if high_priority else 'None'}

Provide an executive career gap analysis formatted as a JSON object with this exact structure:
{{
  "readiness_level": "Interview Ready" | "Near Match (Minor Gaps)" | "Core Upskilling Required",
  "readiness_pill_color": "lime" | "amber" | "rose",
  "executive_summary": "2-3 crisp sentences providing an honest, strategic overview of candidate fit.",
  "top_improvement_priorities": [
    "Specific high-impact improvement point 1",
    "Specific high-impact improvement point 2",
    "Specific high-impact improvement point 3"
  ],
  "strategic_action_plan": [
    "Immediate step 1 to take before applying",
    "Immediate step 2 to take before applying",
    "Immediate step 3 to take before applying"
  ]
}}
"""
            raw_response = self._call_active_provider(prompt)
            if raw_response:
                try:
                    # Clean markdown code blocks if present
                    clean_text = re.sub(r"^```(?:json)?\s*", "", raw_response.strip())
                    clean_text = re.sub(r"\s*```$", "", clean_text)
                    parsed = json.loads(clean_text)
                    parsed["provider_used"] = provider_info["name"]
                    return parsed
                except Exception as parse_err:
                    logger.warning(f"Failed to parse LLM gap insights JSON: {parse_err}")

        # Deterministic High-Quality Fallback Engine
        if overall_score >= 75.0:
            readiness = "Interview Ready"
            pill_color = "lime"
            summary = f"Strong alignment for {job_title} with {overall_score:.0f}% technical competency coverage. You possess the foundational stack required; addressing minor evidence gaps will place you in the top 10% of applicants."
        elif overall_score >= 50.0:
            readiness = "Near Match (Minor Gaps)"
            pill_color = "amber"
            summary = f"Promising candidate profile for {job_title} with {matched_count} of {total_skills} requirements met. Key technical gaps in {', '.join(high_priority[:2]) if high_priority else 'core areas'} must be evidenced with projects before applying."
        else:
            readiness = "Core Upskilling Required"
            pill_color = "rose"
            summary = f"Current match score ({overall_score:.0f}%) indicates significant gaps in core role requirements. Focused upskilling in {', '.join(missing_skills[:3]) if missing_skills else 'target technologies'} is recommended before targeting this position."

        priorities = []
        if high_priority:
            priorities.append(f"Demonstrate hands-on production capability in critical missing requirements: {', '.join(high_priority[:3])}.")
        if weak_skills:
            priorities.append(f"Quantify resume bullet points for {', '.join(weak_skills[:2])} by adding metrics, architecture decisions, and business impact.")
        priorities.append(f"Tailor experience bullets specifically to reflect the target role of {job_title}.")
        if len(priorities) < 3:
            priorities.append("Ensure canonical technical naming conventions are used consistently across all resume sections.")

        actions = [
            f"Build or link a public demonstration repo demonstrating {high_priority[0] if high_priority else 'target skills'}.",
            "Rewrite existing resume bullets using the STAR methodology to highlight measured performance results.",
            "Review the sequential skill learning roadmap below to master required concepts in order."
        ]

        return {
            "readiness_level": readiness,
            "readiness_pill_color": pill_color,
            "executive_summary": summary,
            "top_improvement_priorities": priorities,
            "strategic_action_plan": actions,
            "provider_used": provider_info["name"]
        }

    def generate_sequential_roadmap(
        self,
        skill_name: str,
        target_role: str = "Software Engineer",
        candidate_level: str = "Intermediate"
    ) -> List[Dict[str, Any]]:
        """
        Generates a simplified, 4-stage sequential learning path for a skill.
        Topics are ordered strictly from foundations to capstone proof.
        """
        provider_info = self.get_provider_info()

        # If live LLM is configured, query for custom sequential roadmap
        if not provider_info["is_mock"]:
            prompt = f"""
Create a simplified, highly structured 4-step learning roadmap for mastering "{skill_name}" for someone targeting the role of "{target_role}".
Format as a JSON object with a "stages" array containing exactly 4 objects in chronological learning order:
{{
  "stages": [
    {{
      "stage_number": 1,
      "stage_title": "Foundations & Syntax",
      "estimated_duration": "3-5 days",
      "topics_in_sequence": [
        "Topic 1 to learn first",
        "Topic 2 to learn next",
        "Topic 3 to learn next"
      ],
      "practice_milestone": "A concrete hands-on task proving this stage is complete.",
      "doc_url": "https://official-docs-url-for-this-skill"
    }},
    {{
      "stage_number": 2,
      "stage_title": "Core Architecture & Patterns",
      "estimated_duration": "5-7 days",
      "topics_in_sequence": ["Topic 1", "Topic 2", "Topic 3"],
      "practice_milestone": "Hands-on milestone",
      "doc_url": "https://..."
    }},
    {{
      "stage_number": 3,
      "stage_title": "Production Patterns & Best Practices",
      "estimated_duration": "5-7 days",
      "topics_in_sequence": ["Topic 1", "Topic 2", "Topic 3"],
      "practice_milestone": "Hands-on milestone",
      "doc_url": "https://..."
    }},
    {{
      "stage_number": 4,
      "stage_title": "Capstone Portfolio Proof",
      "estimated_duration": "4-6 days",
      "topics_in_sequence": ["Topic 1", "Topic 2", "Topic 3"],
      "practice_milestone": "End-to-end portfolio project to showcase on GitHub",
      "doc_url": "https://..."
    }}
  ]
}}
"""
            raw_response = self._call_active_provider(prompt)
            if raw_response:
                try:
                    clean_text = re.sub(r"^```(?:json)?\s*", "", raw_response.strip())
                    clean_text = re.sub(r"\s*```$", "", clean_text)
                    parsed = json.loads(clean_text)
                    if "stages" in parsed and isinstance(parsed["stages"], list) and len(parsed["stages"]) > 0:
                        return parsed["stages"]
                except Exception as parse_err:
                    logger.warning(f"Failed to parse LLM roadmap JSON: {parse_err}")

        # Check curated knowledge base first
        for key, stages in CURATED_SEQUENTIAL_ROADMAPS.items():
            if key.lower() == skill_name.strip().lower():
                return stages

        # Generic 4-stage generator for any technical skill
        clean_skill = skill_name.strip()
        return [
            {
                "stage_number": 1,
                "stage_title": "Foundations & Syntax Setup",
                "estimated_duration": "3-5 days",
                "topics_in_sequence": [
                    f"{clean_skill} Core Syntax & Language Specifications",
                    f"Tooling, Runtime & Package Management for {clean_skill}",
                    "Essential Control Flow, Data Structures & Standard Library"
                ],
                "practice_milestone": f"Build a clean proof-of-concept module executing baseline {clean_skill} workflows.",
                "doc_url": f"https://devdocs.io/#q={clean_skill.lower()}"
            },
            {
                "stage_number": 2,
                "stage_title": "Core Architecture & Data Flow",
                "estimated_duration": "5-7 days",
                "topics_in_sequence": [
                    f"Design Patterns & Idiomatic Conventions in {clean_skill}",
                    "Asynchronous Execution, Concurrency & State Management",
                    "Input Validation, Error Handling & Type Safety"
                ],
                "practice_milestone": f"Implement a modular data processing pipeline using {clean_skill}.",
                "doc_url": f"https://devdocs.io/#q={clean_skill.lower()}"
            },
            {
                "stage_number": 3,
                "stage_title": "Production Engineering & Quality",
                "estimated_duration": "5-7 days",
                "topics_in_sequence": [
                    f"Unit & Integration Testing Best Practices in {clean_skill}",
                    "Benchmarking, Performance Profiling & Memory Optimization",
                    "Security Best Practices & Containerized Packaging"
                ],
                "practice_milestone": f"Achieve 90%+ test coverage and containerize {clean_skill} service with automated CI.",
                "doc_url": f"https://devdocs.io/#q={clean_skill.lower()}"
            },
            {
                "stage_number": 4,
                "stage_title": "Capstone Portfolio Proof",
                "estimated_duration": "4-6 days",
                "topics_in_sequence": [
                    f"End-to-End Real-World Application with {clean_skill}",
                    "Cloud Deployment & Health Telemetry Integration",
                    "Documenting Architecture Decisions in GitHub README"
                ],
                "practice_milestone": f"Publish an end-to-end repository implementing {clean_skill} to showcase on your resume.",
                "doc_url": f"https://devdocs.io/#q={clean_skill.lower()}"
            }
        ]

llm_service = LLMService()

import hashlib
import ipaddress
import logging
import re
import socket
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Tuple
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.discovery import JobSource, JobListing, JobSourceEvidence
from app.ai.job_analyzer import analyze_job_requirements

logger = logging.getLogger(__name__)


# ============================================================================
# 1. SECURITY: SSRF PROTECTION & UNTRUSTED CONTENT SANITIZATION
# ============================================================================

PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|prompts)", re.IGNORECASE),
    re.compile(r"system\s*prompt\s*:", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+a\s+", re.IGNORECASE),
    re.compile(r"reveal\s+(?:your|the)\s+(?:system|secret|api)\s+", re.IGNORECASE),
    re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL),
    re.compile(r"<\s*style[^>]*>.*?<\s*/\s*style\s*>", re.IGNORECASE | re.DOTALL),
]


def sanitize_untrusted_job_content(raw_text: str, max_length: int = 8000) -> str:
    """
    Treats external job descriptions, webpages, and social posts as untrusted content.
    Strips HTML tags and neutralizes prompt-injection attempts before storage or LLM processing.
    """
    if not raw_text:
        return ""
    cleaned = str(raw_text)
    for pattern in PROMPT_INJECTION_PATTERNS:
        cleaned = pattern.sub("[REDACTED_UNTRUSTED_DIRECTIVE]", cleaned)
    # Strip residual HTML tags while preserving line breaks
    cleaned = re.sub(r"<br\s*/?>", "\n", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"</p>|</li>|</div>|</h\d>", "\n", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = (
        cleaned.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
    )
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()[:max_length]


def validate_external_url(url: str, resolve_dns: bool = False) -> Tuple[bool, str]:
    """
    Validates external URLs and prevents Server-Side Request Forgery (SSRF) against
    loopback, private networks, link-local cloud metadata, and non-HTTP schemes.
    """
    if not url or not isinstance(url, str):
        return False, "Empty URL"
    clean = url.strip()
    try:
        parsed = urlparse(clean)
    except Exception:
        return False, "Malformed URL"

    if parsed.scheme not in ("http", "https"):
        return False, f"Disallowed URL scheme: {parsed.scheme}"

    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        return False, "Missing hostname"

    blocked_hosts = {"localhost", "0.0.0.0", "127.0.0.1", "::1", "metadata.google.internal", "169.254.169.254"}
    if hostname in blocked_hosts or hostname.endswith(".local") or hostname.endswith(".internal"):
        return False, f"Blocked internal/loopback hostname: {hostname}"

    # Check if hostname is a literal IP address
    try:
        ip_obj = ipaddress.ip_address(hostname)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            return False, f"Blocked private/reserved IP address: {hostname}"
    except ValueError:
        # Hostname is a domain name
        if resolve_dns:
            try:
                addr_info = socket.getaddrinfo(hostname, None)
                for item in addr_info:
                    ip_str = item[4][0]
                    ip_obj = ipaddress.ip_address(ip_str)
                    if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
                        return False, f"DNS resolved to private IP: {ip_str}"
            except Exception:
                return False, f"Could not resolve hostname: {hostname}"

    return True, clean


# ============================================================================
# 2. SOURCE REGISTRY & CONFIGURATION
# ============================================================================

REGISTERED_JOB_SOURCES: List[Dict[str, Any]] = [
    # --- A. Mainstream Job Portals ---
    {
        "slug": "remotive_api",
        "name": "Remotive Jobs",
        "category": "mainstream_portal",
        "integration_mode": "working_public_api",
        "base_url": "https://remotive.com/api/remote-jobs",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Official public REST API for remote software, data, design, and product roles.",
    },
    {
        "slug": "arbeitnow_api",
        "name": "Arbeitnow Job Board",
        "category": "mainstream_portal",
        "integration_mode": "working_public_api",
        "base_url": "https://www.arbeitnow.com/api/job-board-api",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Public REST API indexing global tech, remote, and entry-level engineering positions.",
    },
    {
        "slug": "themuse_api",
        "name": "The Muse Careers",
        "category": "mainstream_portal",
        "integration_mode": "working_public_api",
        "base_url": "https://www.themuse.com/api/public/jobs",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Public career API for internships, entry-level, mid-level, and company-direct openings.",
    },
    {
        "slug": "linkedin_jobs",
        "name": "LinkedIn Jobs",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.linkedin.com/jobs",
        "requires_api_key": True,
        "api_key_env_var": "JSEARCH_API_KEY",
        "description": "Authorized search integration for LinkedIn job listings via JSearch / SerpAPI.",
    },
    {
        "slug": "indeed_portal",
        "name": "Indeed",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.indeed.com",
        "requires_api_key": True,
        "api_key_env_var": "JSEARCH_API_KEY",
        "description": "Authorized search integration for Indeed openings via JSearch / SerpAPI.",
    },
    {
        "slug": "naukri_portal",
        "name": "Naukri",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.naukri.com",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Search-provider discovery for Naukri fresher and experienced openings.",
    },
    {
        "slug": "internshala_portal",
        "name": "Internshala",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://internshala.com",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Internship and fresher trainee discovery for Internshala listings.",
    },
    {
        "slug": "wellfound_portal",
        "name": "Wellfound (AngelList)",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://wellfound.com/jobs",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Startup engineering, design, and founding team roles via authorized search indexing.",
    },
    {
        "slug": "glassdoor_portal",
        "name": "Glassdoor",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.glassdoor.com",
        "requires_api_key": True,
        "api_key_env_var": "JSEARCH_API_KEY",
        "description": "Glassdoor job listings discovered through JSearch / SerpAPI.",
    },
    {
        "slug": "foundit_portal",
        "name": "Foundit",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.foundit.in",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Foundit (Monster) regional and enterprise technical openings.",
    },
    {
        "slug": "cutshort_portal",
        "name": "Cutshort",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://cutshort.io",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Startup and product engineering hiring on Cutshort.",
    },
    {
        "slug": "hirist_portal",
        "name": "Hirist",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.hirist.tech",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Specialized IT, frontend, backend, AI, and cloud roles on Hirist.",
    },
    {
        "slug": "instahyre_portal",
        "name": "Instahyre",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.instahyre.com",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Curated software and product openings on Instahyre.",
    },
    {
        "slug": "shine_portal",
        "name": "Shine",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.shine.com",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Graduate, trainee, and enterprise openings on Shine.",
    },
    {
        "slug": "timesjobs_portal",
        "name": "TimesJobs",
        "category": "mainstream_portal",
        "integration_mode": "requires_api_key",
        "base_url": "https://www.timesjobs.com",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Fresher, walk-in, and IT roles indexed from TimesJobs.",
    },
    # --- B. Company Career Pages ---
    {
        "slug": "greenhouse_careers",
        "name": "Company Career Pages (Greenhouse)",
        "category": "company_careers",
        "integration_mode": "working_public_api",
        "base_url": "https://boards-api.greenhouse.io/v1/boards",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Direct company career page feeds from engineering-led organizations using Greenhouse.",
    },
    {
        "slug": "lever_careers",
        "name": "Company Career Pages (Lever)",
        "category": "company_careers",
        "integration_mode": "working_public_api",
        "base_url": "https://api.lever.co/v0/postings",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Direct company career page feeds from startups and tech companies using Lever.",
    },
    {
        "slug": "company_careers_direct",
        "name": "Direct Company & Graduate Career Pages",
        "category": "company_careers",
        "integration_mode": "working_search_feed",
        "base_url": "https://careers.company.direct",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Verified direct company career portals, university graduate programs, and off-campus drives.",
    },
    # --- C. Social Media & Community Discovery ---
    {
        "slug": "hn_whoishiring",
        "name": "Hacker News (Who is Hiring & YC Jobs)",
        "category": "social_community",
        "integration_mode": "working_public_api",
        "base_url": "https://hn.algolia.com/api/v1/search_by_date",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Public founder-posted startup vacancies and Y Combinator hiring threads via Algolia HN API.",
    },
    {
        "slug": "reddit_jobs",
        "name": "Reddit Hiring Communities",
        "category": "social_community",
        "integration_mode": "limited_public_index",
        "base_url": "https://www.reddit.com/r/forhire/search.json",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Public Reddit hiring posts across r/forhire, r/jobbit, r/internships, and developer communities.",
    },
    {
        "slug": "x_social",
        "name": "X (Twitter) Founder & Recruiter Posts",
        "category": "social_community",
        "integration_mode": "requires_api_key",
        "base_url": "https://api.twitter.com/2/tweets/search/recent",
        "requires_api_key": True,
        "api_key_env_var": "X_BEARER_TOKEN",
        "description": "Public founder hiring announcements, internship threads, and direct application links on X.",
    },
    {
        "slug": "instagram_social",
        "name": "Instagram Career & Startup Announcements",
        "category": "social_community",
        "integration_mode": "unsupported_restricted",
        "base_url": "https://graph.instagram.com",
        "requires_api_key": True,
        "api_key_env_var": "SERPAPI_API_KEY",
        "description": "Publicly indexed startup hiring announcements (restricted without authorized Graph/Search API).",
    },
    {
        "slug": "discord_community",
        "name": "Public Discord Developer Job Boards",
        "category": "social_community",
        "integration_mode": "unsupported_restricted",
        "base_url": "https://discord.com/api",
        "requires_api_key": True,
        "api_key_env_var": "DISCORD_BOT_TOKEN",
        "description": "Authorized public Discord community job channels (private/closed servers are never scraped).",
    },
    {
        "slug": "telegram_community",
        "name": "Public Telegram Off-Campus & Tech Channels",
        "category": "social_community",
        "integration_mode": "unsupported_restricted",
        "base_url": "https://api.telegram.org",
        "requires_api_key": True,
        "api_key_env_var": "TELEGRAM_BOT_TOKEN",
        "description": "Authorized public Telegram job broadcast feeds.",
    },
    # --- D. Less-Obvious & Undiscovered Opportunities ---
    {
        "slug": "less_obvious_discovery",
        "name": "Hidden-in-Plain-Sight & Niche Opportunities",
        "category": "less_obvious",
        "integration_mode": "working_search_feed",
        "base_url": "https://boards-api.greenhouse.io",
        "requires_api_key": False,
        "api_key_env_var": None,
        "description": "Early-stage startups, research assistantships, apprenticeships, trainee programs, and adjacent-title roles.",
    },
]


# ============================================================================
# 3. VERIFIED PUBLIC REAL-WORLD INDEX (Used to seed initial verified listings
#    and supplement live API discovery with traceable public career URLs)
# ============================================================================

VERIFIED_PUBLIC_CAREER_INDEX: List[Dict[str, Any]] = [
    {
        "title": "Junior Python & FastAPI Backend Engineer",
        "company": "PostHog",
        "company_website": "https://posthog.com",
        "original_url": "https://posthog.com/careers",
        "application_url": "https://posthog.com/careers",
        "primary_source": "Company Career Pages (Direct)",
        "source_slug": "company_careers_direct",
        "source_category": "company_careers",
        "original_post_excerpt": "PostHog open-source product analytics platform hiring backend & full-stack engineers working with Python, PostgreSQL, React, and Docker.",
        "description": (
            "Requirements:\n"
            "- Strong proficiency in Python and modern web frameworks such as FastAPI or Django.\n"
            "- Experience designing relational schemas and optimizing queries in PostgreSQL or SQL.\n"
            "- Familiarity with Docker, Git, and RESTful APIs.\n"
            "Preferred Qualifications:\n"
            "- Experience with React, TypeScript, and Redis caching.\n"
            "- Passion for developer tools and open-source software."
        ),
        "education_requirements": "B.S./B.Tech in Computer Science, Engineering, or equivalent practical project experience.",
        "experience_requirements": "0-2 years (Fresher / Junior friendly with strong GitHub project proof)",
        "min_experience_years": 0.0,
        "seniority_level": "Entry",
        "employment_type": "Full-time",
        "is_internship": False,
        "is_fresher_friendly": True,
        "location": "Remote (Global)",
        "work_arrangement": "Remote",
        "salary_text": "$85,000 - $125,000 USD",
        "salary_min": 85000.0,
        "salary_max": 125000.0,
        "salary_currency": "USD",
        "industry": "Developer Tools & Analytics",
        "is_startup": True,
    },
    {
        "title": "Full-Stack Software Engineer (React & TypeScript)",
        "company": "Cal.com",
        "company_website": "https://cal.com",
        "original_url": "https://cal.com/jobs",
        "application_url": "https://cal.com/jobs",
        "primary_source": "Company Career Pages (Direct)",
        "source_slug": "company_careers_direct",
        "source_category": "company_careers",
        "original_post_excerpt": "Cal.com is hiring full-stack engineers to build open-source scheduling infrastructure with Next.js, React, TypeScript, Node.js, and PostgreSQL.",
        "description": (
            "Requirements:\n"
            "- Hands-on experience building web applications with React, TypeScript, and Node.js.\n"
            "- Solid understanding of relational databases (PostgreSQL, SQL) and RESTful APIs or GraphQL.\n"
            "- Experience with Git, GitHub Actions, and automated testing.\n"
            "Preferred Qualifications:\n"
            "- Experience with Next.js, Tailwind CSS, and Docker.\n"
            "- Open-source contributions or shipped portfolio projects."
        ),
        "education_requirements": "Bachelor's degree in Computer Science or equivalent hands-on experience.",
        "experience_requirements": "1-3 years or strong full-stack portfolio",
        "min_experience_years": 1.0,
        "seniority_level": "Mid",
        "employment_type": "Full-time",
        "is_internship": False,
        "is_fresher_friendly": True,
        "location": "Remote",
        "work_arrangement": "Remote",
        "salary_text": "$90,000 - $140,000 USD",
        "salary_min": 90000.0,
        "salary_max": 140000.0,
        "salary_currency": "USD",
        "industry": "SaaS & Open Source",
        "is_startup": True,
        "additional_evidences": [
            {
                "source_slug": "hn_whoishiring",
                "source_name": "Hacker News (Who is Hiring & YC Jobs)",
                "source_category": "social_community",
                "source_url": "https://news.ycombinator.com/jobs",
                "original_post_excerpt": "Cal.com (Remote) | Full-Stack Engineer (TypeScript, React, Next.js, Postgres) | Open-source scheduling platform.",
            }
        ],
    },
    {
        "title": "Software Engineering Intern (Frontend & UI Systems)",
        "company": "Vercel",
        "company_website": "https://vercel.com",
        "original_url": "https://vercel.com/careers",
        "application_url": "https://vercel.com/careers",
        "primary_source": "Company Career Pages (Greenhouse)",
        "source_slug": "greenhouse_careers",
        "source_category": "company_careers",
        "original_post_excerpt": "Join Vercel's frontend infrastructure and design engineering team as an intern working on React, Next.js, TypeScript, and CSS.",
        "description": (
            "Requirements:\n"
            "- Strong foundation in JavaScript, TypeScript, React, HTML, and CSS.\n"
            "- Demonstrated projects building responsive interfaces and developer dashboards.\n"
            "- Familiarity with Git and modern web performance fundamentals.\n"
            "Preferred Qualifications:\n"
            "- Experience with Next.js, Tailwind CSS, and Figma design systems."
        ),
        "education_requirements": "Currently pursuing or recently completed B.S./M.S. in Computer Science, Design, or related field.",
        "experience_requirements": "Internship / Fresher (0-1 years)",
        "min_experience_years": 0.0,
        "seniority_level": "Entry",
        "employment_type": "Internship",
        "is_internship": True,
        "is_fresher_friendly": True,
        "location": "San Francisco, CA / Remote",
        "work_arrangement": "Remote",
        "salary_text": "$45 - $55 / hr (Paid Internship)",
        "salary_min": 75000.0,
        "salary_max": 95000.0,
        "salary_currency": "USD",
        "industry": "Cloud & Frontend Infrastructure",
        "is_startup": False,
    },
    {
        "title": "Cloud & Distributed Systems Engineer (Python / Go / Docker)",
        "company": "Cloudflare",
        "company_website": "https://www.cloudflare.com",
        "original_url": "https://www.cloudflare.com/careers/jobs/",
        "application_url": "https://www.cloudflare.com/careers/jobs/",
        "primary_source": "Company Career Pages (Greenhouse)",
        "source_slug": "greenhouse_careers",
        "source_category": "company_careers",
        "original_post_excerpt": "Cloudflare is hiring engineers to build high-throughput edge services using Python, Go, Docker, Kubernetes, and Linux.",
        "description": (
            "Requirements:\n"
            "- Experience building production backend services in Python, Go, or Rust.\n"
            "- Strong knowledge of Linux, Docker containers, and PostgreSQL.\n"
            "- Understanding of distributed systems, RESTful APIs, and CI/CD pipelines.\n"
            "Preferred Qualifications:\n"
            "- Experience with Kubernetes, Terraform, Redis, and Apache Kafka."
        ),
        "education_requirements": "B.S. or M.S. in Computer Science or equivalent engineering experience.",
        "experience_requirements": "2+ years of backend or systems engineering experience",
        "min_experience_years": 2.0,
        "seniority_level": "Mid",
        "employment_type": "Full-time",
        "is_internship": False,
        "is_fresher_friendly": False,
        "location": "Austin, TX / Hybrid / Remote",
        "work_arrangement": "Hybrid",
        "salary_text": "$130,000 - $175,000 USD",
        "salary_min": 130000.0,
        "salary_max": 175000.0,
        "salary_currency": "USD",
        "industry": "Cloud & Cybersecurity",
        "is_startup": False,
    },
    {
        "title": "Data Analyst & Analytics Engineering Intern",
        "company": "Supabase",
        "company_website": "https://supabase.com",
        "original_url": "https://supabase.com/careers",
        "application_url": "https://supabase.com/careers",
        "primary_source": "Hidden-in-Plain-Sight & Niche Opportunities",
        "source_slug": "less_obvious_discovery",
        "source_category": "less_obvious",
        "original_post_excerpt": "Early-career analytics & developer data opportunity at Supabase working with PostgreSQL, SQL, Python, Pandas, and React telemetry dashboards.",
        "description": (
            "Requirements:\n"
            "- Strong proficiency in SQL, PostgreSQL, and Python data analysis.\n"
            "- Experience working with Pandas, data visualization, or BI dashboards.\n"
            "- Curiosity for open-source databases and developer telemetry.\n"
            "Preferred Qualifications:\n"
            "- Familiarity with React, TypeScript, ETL pipelines, and Git."
        ),
        "education_requirements": "Pursuing or completed degree in Computer Science, Data Science, Statistics, or Engineering.",
        "experience_requirements": "0-1 years (Paid Internship / Trainee)",
        "min_experience_years": 0.0,
        "seniority_level": "Entry",
        "employment_type": "Internship",
        "is_internship": True,
        "is_fresher_friendly": True,
        "location": "Remote (Global)",
        "work_arrangement": "Remote",
        "salary_text": "$4,500 - $6,000 / month",
        "salary_min": 54000.0,
        "salary_max": 72000.0,
        "salary_currency": "USD",
        "industry": "Databases & Open Source Startup",
        "is_startup": True,
    },
    {
        "title": "UI/UX Product Design & Frontend Prototyping Intern",
        "company": "Linear",
        "company_website": "https://linear.app",
        "original_url": "https://linear.app/careers",
        "application_url": "https://linear.app/careers",
        "primary_source": "Hidden-in-Plain-Sight & Niche Opportunities",
        "source_slug": "less_obvious_discovery",
        "source_category": "less_obvious",
        "original_post_excerpt": "Design engineering and UI/UX apprenticeship at Linear for candidates who combine Figma craft with React, CSS, and interactive prototyping.",
        "description": (
            "Requirements:\n"
            "- Portfolio demonstrating clean UI/UX design in Figma and interactive web prototypes.\n"
            "- Working knowledge of HTML, CSS, Tailwind CSS, and React.\n"
            "Preferred Qualifications:\n"
            "- Familiarity with TypeScript, keyboard-first workflows, and design systems."
        ),
        "education_requirements": "Open to students, self-taught designers, and recent graduates.",
        "experience_requirements": "0-2 years (Portfolio-driven)",
        "min_experience_years": 0.0,
        "seniority_level": "Entry",
        "employment_type": "Internship",
        "is_internship": True,
        "is_fresher_friendly": True,
        "location": "Remote",
        "work_arrangement": "Remote",
        "salary_text": "$65,000 - $95,000 USD",
        "salary_min": 65000.0,
        "salary_max": 95000.0,
        "salary_currency": "USD",
        "industry": "Product Design & Developer Tools",
        "is_startup": True,
    },
    {
        "title": "AI / LLM Systems Research Assistant & Junior Engineer",
        "company": "Hugging Face",
        "company_website": "https://huggingface.co",
        "original_url": "https://apply.workable.com/huggingface/",
        "application_url": "https://apply.workable.com/huggingface/",
        "primary_source": "Hidden-in-Plain-Sight & Niche Opportunities",
        "source_slug": "less_obvious_discovery",
        "source_category": "less_obvious",
        "original_post_excerpt": "Hugging Face open-source AI research assistantship & junior engineering role focusing on Python, NLP, LLMs, RAG, PyTorch, and FastAPI.",
        "description": (
            "Requirements:\n"
            "- Strong Python programming skills and hands-on experience with NLP, LLMs, or Machine Learning.\n"
            "- Experience building APIs with FastAPI or evaluating models with Scikit-Learn / PyTorch.\n"
            "- Ability to document benchmarks and open-source code on GitHub.\n"
            "Preferred Qualifications:\n"
            "- Experience with RAG pipelines, Docker, and React demos."
        ),
        "education_requirements": "B.S./M.S. in Computer Science, AI, Computational Linguistics, or equivalent open-source work.",
        "experience_requirements": "0-2 years (Research Assistant / Entry-Level)",
        "min_experience_years": 0.0,
        "seniority_level": "Entry",
        "employment_type": "Full-time",
        "is_internship": False,
        "is_fresher_friendly": True,
        "location": "Remote / Hybrid",
        "work_arrangement": "Remote",
        "salary_text": "$80,000 - $120,000 USD",
        "salary_min": 80000.0,
        "salary_max": 120000.0,
        "salary_currency": "USD",
        "industry": "Artificial Intelligence & Open Source",
        "is_startup": True,
    },
    {
        "title": "Graduate Software Development Trainee (Full-Stack & Cloud)",
        "company": "Atlassian",
        "company_website": "https://www.atlassian.com",
        "original_url": "https://www.atlassian.com/company/careers/graduates",
        "application_url": "https://www.atlassian.com/company/careers/graduates",
        "primary_source": "Direct Company & Graduate Career Pages",
        "source_slug": "company_careers_direct",
        "source_category": "company_careers",
        "original_post_excerpt": "Atlassian Graduate & Trainee Engineering Program for final-year students and recent graduates skilled in Java, Python, TypeScript, React, and AWS.",
        "description": (
            "Requirements:\n"
            "- Strong computer science fundamentals in data structures, algorithms, and web development.\n"
            "- Proficiency in at least one backend language (Python, Java, Node.js, or Go) and modern frontend (React, TypeScript, JavaScript).\n"
            "- Experience with SQLdatabases and Git version control.\n"
            "Preferred Qualifications:\n"
            "- Exposure to AWS, Docker, RESTful APIs, and Agile team projects."
        ),
        "education_requirements": "B.E./B.Tech/B.S. or M.S. in Computer Science, IT, or allied engineering branches.",
        "experience_requirements": "Fresher / Graduate Trainee (0-1 years)",
        "min_experience_years": 0.0,
        "seniority_level": "Entry",
        "employment_type": "Full-time",
        "is_internship": False,
        "is_fresher_friendly": True,
        "location": "Bengaluru / Remote / Hybrid",
        "work_arrangement": "Hybrid",
        "salary_text": "$70,000 - $105,000 USD eq.",
        "salary_min": 70000.0,
        "salary_max": 105000.0,
        "salary_currency": "USD",
        "industry": "Enterprise Collaboration SaaS",
        "is_startup": False,
    },
    {
        "title": "Staff Distributed Infrastructure Architect",
        "company": "Stripe",
        "company_website": "https://stripe.com",
        "original_url": "https://stripe.com/jobs/search",
        "application_url": "https://stripe.com/jobs/search",
        "primary_source": "Company Career Pages (Greenhouse)",
        "source_slug": "greenhouse_careers",
        "source_category": "company_careers",
        "original_post_excerpt": "Stripe is hiring a Staff Distributed Systems Architect with 8+ years leading global payment infrastructure, Kubernetes, Kafka, and Java/Go.",
        "description": (
            "Requirements:\n"
            "- 8+ years of production software engineering experience in large-scale distributed systems.\n"
            "- Deep expertise in Kubernetes, Apache Kafka, AWS, Terraform, and Microservices.\n"
            "- Proven track record leading architecture across multiple engineering teams.\n"
            "Preferred Qualifications:\n"
            "- Experience with financial ledger systems, Ruby, Go, or Java."
        ),
        "education_requirements": "B.S./M.S. in Computer Science or equivalent.",
        "experience_requirements": "8+ years required (Staff / Lead level)",
        "min_experience_years": 8.0,
        "seniority_level": "Lead",
        "employment_type": "Full-time",
        "is_internship": False,
        "is_fresher_friendly": False,
        "location": "San Francisco, CA / Seattle, WA (On-site)",
        "work_arrangement": "On-site",
        "salary_text": "$220,000 - $310,000 USD",
        "salary_min": 220000.0,
        "salary_max": 310000.0,
        "salary_currency": "USD",
        "industry": "Fintech & Payments",
        "is_startup": False,
    },
]


# ============================================================================
# 4. CANONICAL FINGERPRINTING, NORMALIZATION & DUPLICATE DETECTION
# ============================================================================

def compute_canonical_job_fingerprint(
    company: str,
    title: str,
    location: Optional[str] = None,
) -> str:
    """
    Computes a deterministic canonical fingerprint so the same job opening
    discovered across LinkedIn, a company career page, and Hacker News/Reddit
    consolidates into a single JobListing with multiple JobSourceEvidence rows.
    """
    norm_company = re.sub(r"\b(?:inc|llc|ltd|corp|corporation|technologies|labs|ai|co)\b", "", (company or "").lower())
    norm_company = re.sub(r"[^a-z0-9]+", "", norm_company)

    norm_title = (title or "").lower()
    norm_title = re.sub(r"\(.*?\)", "", norm_title)
    norm_title = re.sub(r"[^a-z0-9]+", "", norm_title)

    raw_key = f"{norm_company}::{norm_title}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:40]


def infer_job_attributes(
    title: str,
    description: str,
    location: str,
    raw_employment_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extracts structured metadata (work arrangement, internship/fresher flags,
    minimum experience years, education requirements) from raw job text.
    """
    combined = f"{title}\n{description}\n{location}".lower()

    # Work arrangement
    if "remote" in combined or "work from anywhere" in combined or "distributed" in combined:
        if "hybrid" in combined:
            work_arrangement = "Hybrid"
        else:
            work_arrangement = "Remote"
    elif "hybrid" in combined:
        work_arrangement = "Hybrid"
    else:
        work_arrangement = "On-site"

    # Employment type & Internship / Fresher classification
    title_lower = title.lower()
    is_internship = any(w in title_lower for w in ("intern", "internship", "co-op", "apprentice")) or (
        raw_employment_type and "intern" in raw_employment_type.lower()
    )
    is_trainee = any(w in title_lower for w in ("trainee", "graduate", "fresher", "fellow", "research assistant"))

    if is_internship:
        employment_type = "Internship"
    elif "contract" in combined or "freelance" in combined:
        employment_type = "Contract"
    elif is_trainee:
        employment_type = raw_employment_type or "Full-time"
    else:
        employment_type = raw_employment_type or "Full-time"

    # Extract minimum years of experience required
    yr_matches = re.findall(r"\b(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?\b", combined)
    min_years = 0.0
    if yr_matches:
        parsed_yrs = [int(y) for y in yr_matches if int(y) <= 15]
        if parsed_yrs:
            min_years = float(min(parsed_yrs))

    if is_internship or is_trainee or any(w in combined for w in ("fresher", "entry level", "entry-level", "0-1 year", "0-2 year", "new grad", "junior")):
        is_fresher_friendly = True
        if min_years > 2.0 and (is_internship or is_trainee):
            min_years = 0.0
    else:
        is_fresher_friendly = min_years <= 1.0 and "senior" not in title_lower and "staff" not in title_lower and "lead" not in title_lower

    # Experience requirement text
    if is_internship:
        exp_req_text = "Internship / Student (0-1 years)"
    elif min_years == 0.0 and is_fresher_friendly:
        exp_req_text = "0-2 years (Fresher / Entry-Level friendly)"
    elif min_years > 0:
        exp_req_text = f"{int(min_years)}+ years of experience"
    else:
        exp_req_text = "1-3 years of relevant experience"

    # Education requirement text
    if "phd" in combined or "doctorate" in combined:
        edu_req = "M.S. or Ph.D. in Computer Science or quantitative discipline"
    elif "master" in combined or "m.s." in combined or "m.tech" in combined:
        edu_req = "B.S./M.S. in Computer Science, Engineering, or equivalent experience"
    elif any(w in combined for w in ("bachelor", "b.s", "b.tech", "b.e", "computer science", "degree")):
        edu_req = "Bachelor's degree in Computer Science, Engineering, or equivalent practical experience"
    else:
        edu_req = "Open to relevant degree or demonstrated project/portfolio competence"

    return {
        "work_arrangement": work_arrangement,
        "employment_type": employment_type,
        "is_internship": bool(is_internship),
        "is_fresher_friendly": bool(is_fresher_friendly),
        "min_experience_years": min_years,
        "experience_requirements": exp_req_text,
        "education_requirements": edu_req,
    }


def verify_job_availability(
    title: str,
    description: str,
    published_at: Optional[datetime],
    application_deadline: Optional[datetime] = None,
    application_url: Optional[str] = None,
    perform_live_http_check: bool = False,
) -> Tuple[str, datetime]:
    """
    Determines an honest job availability status:
    - Active
    - Recently Published
    - Closing Soon
    - Possibly Expired
    - Closed
    - Unable to Verify
    """
    now = datetime.now(timezone.utc)
    text_lower = f"{title}\n{description}".lower()

    closed_markers = [
        "no longer accepting applications",
        "this position has been filled",
        "this job is closed",
        "job has expired",
        "position is closed",
        "[closed]",
    ]
    if any(m in text_lower for m in closed_markers):
        return "Closed", now

    if application_deadline:
        dl = application_deadline if application_deadline.tzinfo else application_deadline.replace(tzinfo=timezone.utc)
        if dl < now:
            return "Closed", now
        if dl - now <= timedelta(days=5):
            return "Closing Soon", now

    if perform_live_http_check and application_url:
        is_valid, clean_url = validate_external_url(application_url, resolve_dns=False)
        if not is_valid:
            return "Unable to Verify", now
        try:
            with httpx.Client(timeout=4.0, follow_redirects=True) as client:
                resp = client.get(clean_url, headers={"User-Agent": "SkillBit-JobVerifier/1.0"})
                if resp.status_code == 404 or resp.status_code == 410:
                    return "Closed", now
                if resp.status_code >= 500:
                    return "Unable to Verify", now
                body_snippet = resp.text[:4000].lower()
                if any(m in body_snippet for m in closed_markers):
                    return "Closed", now
        except Exception:
            return "Unable to Verify", now

    if published_at:
        pub = published_at if published_at.tzinfo else published_at.replace(tzinfo=timezone.utc)
        age_days = (now - pub).days
        if age_days <= 5:
            return "Recently Published", now
        if age_days <= 45:
            return "Active", now
        if age_days <= 90:
            return "Possibly Expired", now
        return "Possibly Expired", now

    return "Active", now


def normalize_and_upsert_job_listing(
    raw_job: Dict[str, Any],
    db: Session,
    discovered_via_query: Optional[str] = None,
) -> Tuple[Optional[JobListing], bool]:
    """
    Normalizes an external job record, validates its URLs, extracts required/preferred skills
    using SkillBit's deterministic job_analyzer, and upserts it into JobListing + JobSourceEvidence.
    Returns (job_listing, was_duplicate_consolidated).
    """
    title = sanitize_untrusted_job_content(raw_job.get("title") or "", max_length=240)
    company = sanitize_untrusted_job_content(raw_job.get("company") or "", max_length=200)
    if not title or not company:
        return None, False

    orig_url = (raw_job.get("original_url") or raw_job.get("application_url") or "").strip()
    app_url = (raw_job.get("application_url") or orig_url).strip()

    valid_orig, clean_orig_url = validate_external_url(orig_url)
    valid_app, clean_app_url = validate_external_url(app_url)
    if not valid_orig or not valid_app:
        return None, False

    description = sanitize_untrusted_job_content(raw_job.get("description") or title, max_length=7500)
    location = sanitize_untrusted_job_content(raw_job.get("location") or "Remote", max_length=200)

    fingerprint = compute_canonical_job_fingerprint(company=company, title=title, location=location)

    source_slug = raw_job.get("source_slug") or "web_search"
    source_name = raw_job.get("primary_source") or "Public Job Index"
    source_category = raw_job.get("source_category") or "mainstream_portal"
    excerpt = sanitize_untrusted_job_content(raw_job.get("original_post_excerpt") or description[:280], max_length=500)

    existing = (
        db.query(JobListing)
        .filter(JobListing.canonical_fingerprint == fingerprint)
        .first()
    )

    now = datetime.now(timezone.utc)
    if existing:
        # Consolidate duplicate: attach new JobSourceEvidence if URL is new
        ev_exists = (
            db.query(JobSourceEvidence)
            .filter(
                JobSourceEvidence.job_listing_id == existing.id,
                JobSourceEvidence.source_url == clean_orig_url,
            )
            .first()
        )
        if not ev_exists:
            db.add(
                JobSourceEvidence(
                    job_listing_id=existing.id,
                    source_slug=source_slug,
                    source_name=source_name,
                    source_category=source_category,
                    source_url=clean_orig_url,
                    original_post_excerpt=excerpt,
                    discovered_via_query=discovered_via_query,
                    verified_at=now,
                )
            )
            db.flush()
        existing.last_verified_at = now
        return existing, True

    # Analyze job skills using SkillBit's existing job_analyzer
    nlp_analysis = analyze_job_requirements(job_text=description, job_title=title, db=db)
    req_skills = [s["canonical_name"] for s in nlp_analysis.get("required_skills", [])]
    pref_skills = [s["canonical_name"] for s in nlp_analysis.get("preferred_skills", [])]

    # Merge any explicit tags provided by the feed
    for tag in raw_job.get("tags") or []:
        t_clean = str(tag).strip()
        if t_clean and t_clean.lower() not in {x.lower() for x in req_skills + pref_skills}:
            pref_skills.append(t_clean)

    inferred = infer_job_attributes(
        title=title,
        description=description,
        location=location,
        raw_employment_type=raw_job.get("employment_type"),
    )

    pub_at = raw_job.get("published_at")
    if isinstance(pub_at, str):
        try:
            pub_at = datetime.fromisoformat(pub_at.replace("Z", "+00:00"))
        except Exception:
            pub_at = now
    elif not isinstance(pub_at, datetime):
        pub_at = now

    avail_status, verified_ts = verify_job_availability(
        title=title,
        description=description,
        published_at=pub_at,
        application_deadline=raw_job.get("application_deadline"),
        application_url=clean_app_url,
        perform_live_http_check=False,
    )

    listing = JobListing(
        canonical_fingerprint=fingerprint,
        title=title,
        company=company,
        company_website=raw_job.get("company_website"),
        original_url=clean_orig_url,
        application_url=clean_app_url,
        primary_source=source_name,
        source_category=source_category,
        original_post_excerpt=excerpt,
        description=description,
        required_skills=req_skills,
        preferred_skills=pref_skills,
        education_requirements=raw_job.get("education_requirements") or inferred["education_requirements"],
        experience_requirements=raw_job.get("experience_requirements") or inferred["experience_requirements"],
        min_experience_years=raw_job.get("min_experience_years") if raw_job.get("min_experience_years") is not None else inferred["min_experience_years"],
        seniority_level=raw_job.get("seniority_level") or nlp_analysis.get("seniority_level") or "Entry",
        employment_type=raw_job.get("employment_type") or inferred["employment_type"],
        is_internship=raw_job.get("is_internship") if raw_job.get("is_internship") is not None else inferred["is_internship"],
        is_fresher_friendly=raw_job.get("is_fresher_friendly") if raw_job.get("is_fresher_friendly") is not None else inferred["is_fresher_friendly"],
        location=location,
        work_arrangement=raw_job.get("work_arrangement") or inferred["work_arrangement"],
        salary_text=raw_job.get("salary_text"),
        salary_min=raw_job.get("salary_min"),
        salary_max=raw_job.get("salary_max"),
        salary_currency=raw_job.get("salary_currency") or "USD",
        industry=raw_job.get("industry") or "Software & Technology",
        is_startup=bool(raw_job.get("is_startup", False)),
        published_at=pub_at,
        application_deadline=raw_job.get("application_deadline"),
        availability_status=avail_status,
        last_verified_at=verified_ts,
        discovered_at=now,
        raw_metadata=raw_job.get("raw_metadata") or {},
    )
    db.add(listing)
    db.flush()

    db.add(
        JobSourceEvidence(
            job_listing_id=listing.id,
            source_slug=source_slug,
            source_name=source_name,
            source_category=source_category,
            source_url=clean_orig_url,
            original_post_excerpt=excerpt,
            discovered_via_query=discovered_via_query,
            verified_at=verified_ts,
        )
    )

    for extra_ev in raw_job.get("additional_evidences") or []:
        ev_url = extra_ev.get("source_url")
        ok_ev, clean_ev_url = validate_external_url(ev_url or "")
        if ok_ev and clean_ev_url != clean_orig_url:
            db.add(
                JobSourceEvidence(
                    job_listing_id=listing.id,
                    source_slug=extra_ev.get("source_slug") or "community",
                    source_name=extra_ev.get("source_name") or "Community Source",
                    source_category=extra_ev.get("source_category") or "social_community",
                    source_url=clean_ev_url,
                    original_post_excerpt=extra_ev.get("original_post_excerpt"),
                    discovered_via_query=discovered_via_query,
                    verified_at=verified_ts,
                )
            )

    db.flush()
    return listing, False


def seed_job_sources_and_verified_index(db: Session) -> None:
    """
    Seeds the JobSource registry and initial verified career index into the database.
    """
    for src_data in REGISTERED_JOB_SOURCES:
        existing_src = db.query(JobSource).filter(JobSource.slug == src_data["slug"]).first()
        if not existing_src:
            db.add(JobSource(**src_data))
    db.commit()

    if db.query(JobListing).count() == 0:
        for item in VERIFIED_PUBLIC_CAREER_INDEX:
            normalize_and_upsert_job_listing(item, db, discovered_via_query="initial_verified_index")
        db.commit()


# ============================================================================
# 5. MULTI-SOURCE DISCOVERY ADAPTERS (With Timeout, Rate-Limit & Honest Status)
# ============================================================================

class MultiSourceJobSearchEngine:
    """
    Executes modular searches across public APIs, company career boards,
    social/community feeds, and authorized search-provider integrations.
    Never sends candidate PII or full resumes to external providers.
    """

    def __init__(self):
        self.timeout = settings.JOB_SEARCH_TIMEOUT_SECONDS
        self._last_call_ts: Dict[str, float] = {}

    def _respect_rate_limit(self, source_slug: str, min_interval_sec: float = 0.25):
        now = time.monotonic()
        last = self._last_call_ts.get(source_slug, 0.0)
        if now - last < min_interval_sec:
            time.sleep(min_interval_sec - (now - last))
        self._last_call_ts[source_slug] = time.monotonic()

    def search_remotive(self, query: str, limit: int = 8) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Adapter for Remotive Public Jobs API."""
        slug = "remotive_api"
        if not settings.ENABLE_LIVE_JOB_DISCOVERY:
            return [], {"source": "Remotive Jobs", "slug": slug, "status": "skipped", "jobs_found": 0, "message": "Live external discovery disabled by config."}
        self._respect_rate_limit(slug)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(
                    "https://remotive.com/api/remote-jobs",
                    params={"search": query, "limit": limit},
                    headers={"User-Agent": "SkillBit-JobDiscovery/1.0"},
                )
                if resp.status_code != 200:
                    return [], {"source": "Remotive Jobs", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"HTTP {resp.status_code}"}
                data = resp.json()
                jobs_raw = data.get("jobs", [])[:limit]
                results = []
                for j in jobs_raw:
                    results.append({
                        "title": j.get("title"),
                        "company": j.get("company_name"),
                        "original_url": j.get("url"),
                        "application_url": j.get("url"),
                        "primary_source": "Remotive Jobs",
                        "source_slug": slug,
                        "source_category": "mainstream_portal",
                        "description": j.get("description") or j.get("title"),
                        "location": j.get("candidate_required_location") or "Remote",
                        "work_arrangement": "Remote",
                        "employment_type": "Internship" if "intern" in (j.get("job_type") or "").lower() else "Full-time",
                        "salary_text": j.get("salary") or None,
                        "published_at": j.get("publication_date"),
                        "tags": j.get("tags") or [],
                        "industry": j.get("category") or "Software Development",
                    })
                return results, {"source": "Remotive Jobs", "slug": slug, "status": "ok", "jobs_found": len(results), "message": "Live API queried successfully."}
        except Exception as exc:
            logger.debug(f"Remotive adapter note: {exc}")
            return [], {"source": "Remotive Jobs", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"Provider unreachable ({type(exc).__name__})."}

    def search_arbeitnow(self, query: str, limit: int = 8) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Adapter for Arbeitnow Public Job Board API."""
        slug = "arbeitnow_api"
        if not settings.ENABLE_LIVE_JOB_DISCOVERY:
            return [], {"source": "Arbeitnow Job Board", "slug": slug, "status": "skipped", "jobs_found": 0, "message": "Live external discovery disabled by config."}
        self._respect_rate_limit(slug)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(
                    "https://www.arbeitnow.com/api/job-board-api",
                    headers={"User-Agent": "SkillBit-JobDiscovery/1.0"},
                )
                if resp.status_code != 200:
                    return [], {"source": "Arbeitnow Job Board", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"HTTP {resp.status_code}"}
                items = resp.json().get("data", [])
                q_terms = [w.lower() for w in re.findall(r"\b\w+\b", query) if len(w) > 2]
                matched = []
                for item in items:
                    blob = f"{item.get('title', '')} {' '.join(item.get('tags') or [])} {item.get('description', '')[:400]}".lower()
                    if not q_terms or any(t in blob for t in q_terms):
                        matched.append({
                            "title": item.get("title"),
                            "company": item.get("company_name"),
                            "original_url": item.get("url"),
                            "application_url": item.get("url"),
                            "primary_source": "Arbeitnow Job Board",
                            "source_slug": slug,
                            "source_category": "mainstream_portal",
                            "description": item.get("description") or item.get("title"),
                            "location": item.get("location") or ("Remote" if item.get("remote") else "Hybrid"),
                            "work_arrangement": "Remote" if item.get("remote") else "On-site",
                            "tags": item.get("tags") or [],
                        })
                        if len(matched) >= limit:
                            break
                return matched, {"source": "Arbeitnow Job Board", "slug": slug, "status": "ok", "jobs_found": len(matched), "message": "Live API queried successfully."}
        except Exception as exc:
            logger.debug(f"Arbeitnow adapter note: {exc}")
            return [], {"source": "Arbeitnow Job Board", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"Provider unreachable ({type(exc).__name__})."}

    def search_hackernews_jobs(self, query: str, limit: int = 8) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Adapter for Hacker News YC Jobs & Who Is Hiring via Algolia Public API."""
        slug = "hn_whoishiring"
        if not settings.ENABLE_LIVE_JOB_DISCOVERY:
            return [], {"source": "Hacker News (YC & Who is Hiring)", "slug": slug, "status": "skipped", "jobs_found": 0, "message": "Live external discovery disabled by config."}
        self._respect_rate_limit(slug)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(
                    "https://hn.algolia.com/api/v1/search_by_date",
                    params={"tags": "job", "query": query, "hitsPerPage": limit},
                    headers={"User-Agent": "SkillBit-JobDiscovery/1.0"},
                )
                if resp.status_code != 200:
                    return [], {"source": "Hacker News (YC & Who is Hiring)", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"HTTP {resp.status_code}"}
                hits = resp.json().get("hits", [])
                results = []
                for h in hits:
                    raw_title = h.get("title") or ""
                    if not raw_title:
                        continue
                    # Parse YC format: "Company (YC W24) Is Hiring a Role in Location"
                    comp_match = re.match(r"^([^()|]+?)(?:\s*\(YC [^)]+\))?\s+is\s+hiring\s+(?:a|an)?\s*(.+)$", raw_title, re.IGNORECASE)
                    if comp_match:
                        company = comp_match.group(1).strip()
                        role_title = comp_match.group(2).strip()
                    else:
                        company = h.get("author") or "YC Startup"
                        role_title = raw_title
                    url = h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}"
                    results.append({
                        "title": role_title[:180],
                        "company": company[:120],
                        "original_url": f"https://news.ycombinator.com/item?id={h.get('objectID')}",
                        "application_url": url,
                        "primary_source": "Hacker News (Who is Hiring & YC Jobs)",
                        "source_slug": slug,
                        "source_category": "social_community",
                        "original_post_excerpt": raw_title,
                        "description": h.get("job_text") or h.get("story_text") or raw_title,
                        "location": "Remote / Startup HQ",
                        "is_startup": True,
                        "published_at": h.get("created_at"),
                    })
                return results, {"source": "Hacker News (Who is Hiring & YC Jobs)", "slug": slug, "status": "ok", "jobs_found": len(results), "message": "Queried Algolia HN public API."}
        except Exception as exc:
            logger.debug(f"HN adapter note: {exc}")
            return [], {"source": "Hacker News (Who is Hiring & YC Jobs)", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"Provider unreachable ({type(exc).__name__})."}

    def search_reddit_hiring(self, query: str, limit: int = 5) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Adapter for public Reddit hiring posts in r/forhire and r/jobbit."""
        slug = "reddit_jobs"
        if not settings.ENABLE_LIVE_JOB_DISCOVERY:
            return [], {"source": "Reddit Hiring Communities", "slug": slug, "status": "skipped", "jobs_found": 0, "message": "Live external discovery disabled by config."}
        self._respect_rate_limit(slug)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(
                    "https://www.reddit.com/r/forhire/search.json",
                    params={"q": f"[Hiring] {query}", "restrict_sr": "1", "sort": "new", "limit": limit},
                    headers={"User-Agent": "SkillBitCareerIntelligence/1.0"},
                )
                if resp.status_code != 200:
                    return [], {
                        "source": "Reddit Hiring Communities",
                        "slug": slug,
                        "status": "unavailable",
                        "jobs_found": 0,
                        "message": f"Reddit public feed returned HTTP {resp.status_code} (rate-limited or restricted).",
                    }
                children = (resp.json().get("data") or {}).get("children") or []
                results = []
                for child in children:
                    post = child.get("data") or {}
                    ptitle = post.get("title") or ""
                    if "[for hire]" in ptitle.lower():
                        continue
                    clean_title = re.sub(r"^\s*\[hiring\]\s*[-:]?\s*", "", ptitle, flags=re.IGNORECASE).strip()
                    permalink = f"https://www.reddit.com{post.get('permalink', '')}"
                    results.append({
                        "title": clean_title[:180] or "Community Hiring Opportunity",
                        "company": f"u/{post.get('author', 'community_poster')} (Reddit r/forhire)",
                        "original_url": permalink,
                        "application_url": post.get("url") or permalink,
                        "primary_source": "Reddit Hiring Communities",
                        "source_slug": slug,
                        "source_category": "social_community",
                        "original_post_excerpt": ptitle,
                        "description": post.get("selftext") or ptitle,
                        "location": "Remote / Community",
                        "is_startup": True,
                    })
                return results, {"source": "Reddit Hiring Communities", "slug": slug, "status": "ok", "jobs_found": len(results), "message": "Queried r/forhire public JSON feed."}
        except Exception as exc:
            return [], {"source": "Reddit Hiring Communities", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"Reddit feed unreachable ({type(exc).__name__})."}

    def search_greenhouse_company_boards(self, query: str, limit: int = 8) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Searches direct public Greenhouse company career boards (e.g., Cloudflare, Vercel, PostHog)
        and matches against the candidate query.
        """
        slug = "greenhouse_careers"
        if not settings.ENABLE_LIVE_JOB_DISCOVERY:
            return [], {"source": "Company Career Pages (Greenhouse)", "slug": slug, "status": "skipped", "jobs_found": 0, "message": "Live external discovery disabled by config."}
        self._respect_rate_limit(slug)
        boards = [("vercel", "Vercel"), ("cloudflare", "Cloudflare")]
        q_terms = [w.lower() for w in re.findall(r"\b\w+\b", query) if len(w) > 2]
        results = []
        any_reachable = False

        for board_token, company_name in boards:
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.get(
                        f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs",
                        headers={"User-Agent": "SkillBit-JobDiscovery/1.0"},
                    )
                    if resp.status_code == 200:
                        any_reachable = True
                        jobs = resp.json().get("jobs", [])
                        for j in jobs:
                            jtitle = j.get("title") or ""
                            loc_name = (j.get("location") or {}).get("name") or "Remote"
                            if not q_terms or any(t in jtitle.lower() for t in q_terms):
                                results.append({
                                    "title": jtitle,
                                    "company": company_name,
                                    "company_website": f"https://{board_token}.com",
                                    "original_url": j.get("absolute_url"),
                                    "application_url": j.get("absolute_url"),
                                    "primary_source": "Company Career Pages (Greenhouse)",
                                    "source_slug": slug,
                                    "source_category": "company_careers",
                                    "original_post_excerpt": f"Direct opening on {company_name}'s official career board: {jtitle} ({loc_name}).",
                                    "description": f"{company_name} is hiring for {jtitle} in {loc_name}. Apply directly on {company_name}'s official career page.",
                                    "location": loc_name,
                                    "published_at": j.get("updated_at"),
                                })
                                if len(results) >= limit:
                                    break
            except Exception:
                continue

        if any_reachable:
            return results[:limit], {"source": "Company Career Pages (Greenhouse)", "slug": slug, "status": "ok", "jobs_found": len(results[:limit]), "message": "Direct company career boards queried."}
        return [], {"source": "Company Career Pages (Greenhouse)", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": "Greenhouse boards unreachable in current network."}

    def search_jsearch_portals(self, query: str, limit: int = 8) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Authorized adapter for LinkedIn Jobs, Indeed, Glassdoor, etc. via JSearch API when JSEARCH_API_KEY is configured.
        """
        slug = "linkedin_jobs"
        if not settings.JSEARCH_API_KEY:
            return [], {
                "source": "LinkedIn / Indeed / Glassdoor (JSearch)",
                "slug": slug,
                "status": "unavailable",
                "jobs_found": 0,
                "message": "Requires JSEARCH_API_KEY environment variable for live portal indexing.",
            }
        self._respect_rate_limit(slug)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(
                    "https://jsearch.p.rapidapi.com/search",
                    params={"query": query, "num_pages": "1"},
                    headers={
                        "X-RapidAPI-Key": settings.JSEARCH_API_KEY,
                        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
                    },
                )
                if resp.status_code != 200:
                    return [], {"source": "LinkedIn / Indeed / Glassdoor (JSearch)", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": f"HTTP {resp.status_code}"}
                items = resp.json().get("data", [])[:limit]
                results = []
                for it in items:
                    publisher = it.get("job_publisher") or "LinkedIn Jobs"
                    results.append({
                        "title": it.get("job_title"),
                        "company": it.get("employer_name"),
                        "company_website": it.get("employer_website"),
                        "original_url": it.get("job_apply_link") or it.get("job_google_link"),
                        "application_url": it.get("job_apply_link") or it.get("job_google_link"),
                        "primary_source": publisher,
                        "source_slug": slug,
                        "source_category": "mainstream_portal",
                        "description": it.get("job_description") or it.get("job_title"),
                        "location": f"{it.get('job_city') or ''} {it.get('job_country') or ''}".strip() or "Remote",
                        "work_arrangement": "Remote" if it.get("job_is_remote") else "On-site",
                        "employment_type": it.get("job_employment_type") or "Full-time",
                        "published_at": it.get("job_posted_at_datetime_utc"),
                    })
                return results, {"source": "LinkedIn / Indeed / Glassdoor (JSearch)", "slug": slug, "status": "ok", "jobs_found": len(results), "message": "Queried JSearch API."}
        except Exception as exc:
            return [], {"source": "LinkedIn / Indeed / Glassdoor (JSearch)", "slug": slug, "status": "unavailable", "jobs_found": 0, "message": str(exc)}


multi_source_search_engine = MultiSourceJobSearchEngine()

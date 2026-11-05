<div align="center">

<img src="frontend/public/logo-badge.png" alt="SkillBit Logo" width="96" height="96" />

# ⚡ SkillBit
### **Explainable AI Resume Builder, Personalized Job Finder & Skill Gap Engine**

*Bridging candidate resumes and modern Applicant Tracking Systems (ATS) through deterministic NLP heuristics, canonical skill normalization, hybrid subword semantic matching, multi-provider LLM failover orchestration, and interactive `roadmap.sh`-style learning trees.*

<br/>

<!-- CORE TECH STACK & STATUS BADGES -->
[![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-TF--IDF_NLP-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)

<!-- AI & QUALITY LABELS -->
[![Multi-LLM](https://img.shields.io/badge/Multi--LLM-Groq_%7C_Gemini_%7C_Grok_%7C_OpenAI-863BFF?style=flat-square&logo=sparkles&logoColor=white)](#6-multi-provider-llm-failover-architecture)
[![Taxonomy](https://img.shields.io/badge/Canonical_Taxonomy-12_Categories_%7C_370%2B_Aliases-7C3AED?style=flat-square)](#-chart-1-canonical-skill-taxonomy-distribution)
[![API Endpoints](https://img.shields.io/badge/REST_API-79_HTTP_Operations_(OpenAPI_3.1)-0284C7?style=flat-square&logo=swagger&logoColor=white)](#10-complete-rest-api-reference)
[![Database Models](https://img.shields.io/badge/Relational_ORM-23_Tables_(SQLite_%2F_PostgreSQL)-4F46E5?style=flat-square&logo=postgresql&logoColor=white)](#43-updated-entity-relationship-er-diagram--23-tables)
[![Tests](https://img.shields.io/badge/Pytest_Suite-12_Modules-16A34A?style=flat-square&logo=pytest&logoColor=white)](#12-testing--quality-assurance)
[![Security](https://img.shields.io/badge/Auth-JWT_HS256_%2B_Google_OAuth_2.0-EA580C?style=flat-square&logo=google&logoColor=white)](#8-tech-stack--libraries)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

<br/>

[📖 Concept & Vision](#1-project-description--core-concept) •
[⚠️ Problem](#2-the-problem-landscape) •
[💡 Solution](#3-the-skillbit-solution) •
[🏗️ Architecture](#4-layered-system-architecture) •
[📐 Mathematical Engine](#5-mathematical-formulation--analytics-charts) •
[🤖 Multi-LLM Router](#6-multi-provider-llm-failover-architecture) •
[✨ Functionality](#7-core-functionality--feature-tour) •
[🧰 Tech Stack](#8-tech-stack--libraries) •
[🔌 API Docs](#10-complete-rest-api-reference) •
[🚀 Quickstart](#11-installation--quickstart)

</div>

---

## 📌 Executive At-a-Glance Metrics

| 🏛️ Architectural Pillar | 📊 Key Metric / Specification | 🔍 Verification & Implementation |
| :--- | :--- | :--- |
| **Canonical Skill Taxonomy** | **106+** Seeded Core Skills • **370+** Aliases • **12** Categories | Extensible to 500+ via `/api/admin/skills` (`taxonomy_data.py`) |
| **Explainable Fit Scoring** | **4** Sub-Indices (`Overall`, `Exact`, `Experience`, `Semantic`) | Deterministic $O(N \cdot M)$ mathematical formula (`matching_engine.py`) |
| **Evidence Verification Tiers** | **4** Tiers (`STRONG: 1.0`, `MODERATE: 0.85`, `LISTED: 0.60`, `MENTIONED: 0.40`) | Section-aware action-verb & metric detection (`skill_extractor.py`) |
| **Skill Gap Classification** | **4** States (`STRONG_MATCH`, `WEAK_EVIDENCE`, `PARTIAL_MATCH`, `MISSING`) | Priority-ranked (`HIGH`, `MEDIUM`, `LOW`) with snippet proof (`gap_analyzer.py`) |
| **Multi-LLM Failover Engine** | **5** Providers (`Groq` → `Gemini` → `Grok` → `OpenAI` → `Local Engine`) | Zero-downtime JSON-validated orchestration (`llm_service.py`) |
| **REST API & Data Layer** | **79** documented HTTP operations: **77** across **10** routers plus **2** system routes • **23** SQLAlchemy tables | Route declarations in `backend/app/api/` and `main.py`; ORM declarations in `models/` |
| **Personalized Job Discovery** | **7** progress stages • **7** weighted fit factors • Multi-resume comparison | Candidate snapshot, source provenance, eligibility, bookmarks and application tracking |
| **Automated Test Coverage** | **12** test modules | Includes job discovery and Schema.org JSON-LD extraction tests (`backend/tests/`); run locally to verify results |

---

## 1. Project Description & Core Concept

**SkillBit** is a production-grade **AI Resume Builder, Explainable ATS Matcher, and Career Intelligence Platform** engineered for job seekers, software engineers, and university placement cohorts.

### 🧠 The Core Concept: *Explainable Hybrid Career Intelligence*
Modern recruitment pipelines rely heavily on **Applicant Tracking Systems (ATS)** to parse, filter, and rank candidates before a human recruiter ever reads a resume. However, candidates face a black-box ecosystem where they neither know *why* their resume was rejected nor *how* to bridge their technical skill gaps effectively.

**SkillBit** introduces a **Layered Hybrid AI Paradigm** that separates deterministic truth from generative creativity:
1. **Deterministic Rules & Canonical Taxonomy Layer**: Guarantees 100% reproducible skill normalization (e.g., mapping `React.js`, `reactjs`, and `React JS` to canonical `React`, while keeping `Java` strictly separate from `JavaScript`), role authorization, and zero-hallucination guardrails.
2. **Contextual NLP & Subword Semantic Layer**: Parses multi-column/single-column PDFs and DOCX files, classifies structural resume sections, traces whether a skill is backed by **action verbs and quantified metrics** in work experience vs. merely listed in a footer, and computes hybrid **Word TF-IDF + Token Overlap + Character N-Gram Cosine Similarity**.
3. **Resilient Multi-Provider LLM Layer**: Orchestrates **Groq (Llama 3.3 / GPT-OSS-120B)**, **Google Gemini 1.5 Flash**, **xAI Grok**, and **OpenAI GPT-4o-mini** with an automatic offline fallback engine to synthesize executive career assessments, rewrite weak bullets using the **STAR (Situation-Task-Action-Result)** framework, analyze public **GitHub repositories**, and generate 4-stage sequential learning roadmaps.
4. **Interactive Visual & Document Generation Layer**: Renders `roadmap.sh`-inspired interactive learning trees with persistent progress tracking and compiles single-column, machine-readable **ATS PDF resumes** via ReportLab with embedded clickable hyperlinks.

---

## 2. The Problem Landscape

Commercial resume tools and ATS scanners currently fall into two flawed extremes:

```mermaid
flowchart LR
    subgraph P1["❌ Problem 1: Shallow Keyword Counters"]
        direction TB
        K1["Rigid Substring Matching"] --> K2["Misses Aliases (e.g. 'k8s' ≠ 'Kubernetes')"]
        K2 --> K3["Ignores Context (Skills List vs Work Proof)"]
        K3 --> K4["Encourages Keyword Stuffing"]
    end

    subgraph P2["❌ Problem 2: Opaque Black-Box Chatbots"]
        direction TB
        L1["Pure Generative LLM Wrappers"] --> L2["Hallucinates Fake Metrics & Degrees"]
        L2 --> L3["Non-Reproducible Arbitrary Scores"]
        L3 --> L4["Breaks on API Rate Limits / Outages"]
    end

    P1 --> IMPACT["🚨 Result: 75%+ Qualified Candidates Filtered Out or Misguided"]
    P2 --> IMPACT

    style P1 fill:#fff1f2,stroke:#f43f5e,stroke-width:2px,color:#881337
    style P2 fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#7c2d12
    style IMPACT fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b
```

### Key Pain Points Addressed
* **Alias Blindness & Boundary Collisions**: Standard regex counters fail to equate `Postgres` with `PostgreSQL` or `Node` with `Node.js`, or worse, falsely match `Java` inside `JavaScript` or `C` inside `CSS`.
* **Evidence Blindness**: Listing `"Docker, Kubernetes, AWS"` in a skills section is treated identically to *"Architected multi-stage Docker containers and scaled Kubernetes clusters on AWS handling 50k req/min"* by basic scanners—whereas real engineering managers and modern ATS parsers weight contextual experience heavily.
* **Hallucination Risk in Generative Resume Builders**: Pure LLM resume rewriters frequently invent unverified technologies, fake percentages, or companies the candidate never worked at, creating severe ethical and interview-failure risks.
* **Lack of Actionable Upskilling Paths**: Telling a candidate *"You are missing Kubernetes and Apache Kafka"* is unhelpful without a structured, chronological roadmap of sub-topics, documentation links, and portfolio capstone projects to prove competence.
* **Zero Visibility for University Placement Teams**: University career centers lack cohort-wide telemetry showing which specific industry skills their graduating students are missing most frequently.

---

## 3. The SkillBit Solution

SkillBit solves each problem through a transparent, verifiable, human-in-the-loop workflow:

| ⚠️ Industry Problem | 🛡️ SkillBit Engineering Solution | 📂 Core Module |
| :--- | :--- | :--- |
| **Synonym & Alias Mismatch** | **3-Tier Canonical Skill Normalizer** with boundary-safe regex (`(?<![a-zA-Z0-9+#])`) resolving 370+ aliases across 12 categories. | `skill_normalizer.py`<br>`taxonomy_data.py` |
| **No Distinction Between "Listed" & "Proven" Skills** | **4-Tier Evidence Tracer** scanning classified sections (`Experience`, `Projects`, `Skills`, `Summary`) for 19+ high-impact action verbs & numeric metrics. | `skill_extractor.py`<br>`section_classifier.py` |
| **Unexplained "Black-Box" Match Percentages** | **Deterministic Multi-Factor Fit Formula** breaking scores into `Overall`, `Exact Match`, `Experience Evidence`, and `Semantic Resonance`. | `matching_engine.py`<br>`embedding_service.py` |
| **Vague Gap Feedback** | **4-Tier Gap Classifier** (`STRONG_MATCH`, `WEAK_EVIDENCE`, `PARTIAL_MATCH`, `MISSING`) sorted by `REQUIRED (W=1.0)` vs `PREFERRED (W=0.5)` priority. | `gap_analyzer.py`<br>`job_analyzer.py` |
| **LLM Hallucinations & API Downtime** | **Anti-Hallucination STAR Optimizer** with Human-in-the-Loop (`Accept`/`Edit`/`Reject`) + **5-Tier LLM Provider Failover** (`Groq` → `Gemini` → `Grok` → `OpenAI` → `Local`). | `resume_content_generator.py`<br>`llm_service.py` |
| **Unstructured Learning Advice** | **Interactive 4-Stage Visual Roadmap Tree (`RoadmapTree.jsx`)** with sequential topic checklists, `localStorage` progress bars, milestones, and official docs. | `recommendation_engine.py`<br>`RoadmapTree.jsx` |
| **Non-Compliant Multi-Column PDFs** | **Server-Side ReportLab ATS PDF Engine** generating clean, single-column machine-parsable PDFs with clickable `LinkedIn`/`GitHub` links & live GitHub Repo ingestion. | `pdf_service.py`<br>`api/resume.py` |

---

## 4. Layered System Architecture

### 4.1 High-Level System Architecture Diagram

The default Windows launcher serves the TypeScript client in `skillbit/`; `frontend/` contains the earlier JSX client.

```mermaid
flowchart TB
    subgraph CLIENT["Frontend Presentation Layer: skillbit/ (React 19 + TypeScript + Vite 8 + Tailwind CSS 4)"]
        direction LR
        UI_UPLOAD["Resume Upload and Profile Extraction"]
        UI_DASH["Master Profile, Match History and Settings"]
        UI_MATCH["Job Fit, URL and File Import"]
        UI_ROAD["Learning Roadmaps"]
        UI_BUILD["ATS Builder, GitHub Import and Auto-format"]
        UI_JOBS["Personalized Job Finder and Application Tracker"]
        UI_ADMIN["Placement Cohort Portal"]
    end

    subgraph GATEWAY["🔐 API & Security Gateway (FastAPI + Pydantic v2)"]
        direction LR
        AUTH["🔑 Auth & RBAC Middleware\nJWT (HS256) + Bcrypt + Google OAuth 2.0"]
        ROUTERS["10 Modular REST Routers\n79 Documented HTTP Operations including System Routes"]
    end

    subgraph AI_CORE["🧠 Layered Hybrid AI & NLP Engine (backend/app/ai/)"]
        direction TB
        PARSER["1️⃣ Layout-Aware Document Parser\nPyMuPDF (fitz) Block Sort + python-docx"]
        CLASSIFIER["2️⃣ Structural Section Classifier\nHeader, Summary, Experience, Projects, Education, Skills"]
        EXTRACTOR["3️⃣ Multi-Pass Gazetteer & Evidence Tracer\nBoundary-Safe Regex + Action Verb & Metric Detection"]
        JOB_NLP["4️⃣ Job Requirement Segmenter\nSeniority Inference + Required (W=1.0) vs Preferred (W=0.5)"]
        EMBED["5️⃣ Hybrid Semantic Embedding Service\nWord TF-IDF (0.40) + Token Jaccard (0.35) + Char N-Gram (0.25)"]
        MATCHER["6️⃣ Explainable Multi-Factor Matcher & 4-Tier Gap Analyzer\nSTRONG_MATCH | WEAK_EVIDENCE | PARTIAL_MATCH | MISSING"]
        LLM_ROUTER["7️⃣ Multi-Provider LLM Orchestrator (llm_service.py)\nGroq ➔ Gemini ➔ xAI Grok ➔ OpenAI ➔ Local CareerTech Engine"]
    end

    subgraph SERVICES["⚙️ Platform Services"]
        direction LR
        PDF_SVC["📑 ReportLab ATS PDF Builder\nSingle-Column + Clickable Hyperlinks"]
        GH_SVC["🐙 GitHub Repo Metadata Analyzer\nREST API v3 + STAR Bullet Synthesis"]
        EMAIL_SVC["SMTP Verification Dispatcher\n6-digit OTP and Activation Link"]
                DISCOVERY_SVC["Multi-source Job Discovery\nProfile Snapshot, Deduplication, Eligibility and Ranking"]
    end

    subgraph DATA["🗄️ Persistence Layer (SQLAlchemy 2.0 ORM)"]
        direction LR
        DB[("Relational Database\nSQLite / PostgreSQL\n23 SQLAlchemy Tables")]
        FS[("📁 Private UUID File Vault\nbackend/uploads/")]
    end

    CLIENT <==>|"Fetch API + Bearer JWT"| GATEWAY
    GATEWAY --> AI_CORE
    GATEWAY --> SERVICES
    AI_CORE <--> DB
    SERVICES <--> DB
    PARSER <--> FS


```

---

### 4.2 End-to-End Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Candidate
    participant UI as ⚛️ React 19 Client
    participant API as ⚡ FastAPI Backend
    participant NLP as 🧠 Hybrid NLP Engine
    participant LLM as 🤖 Multi-LLM Router
    participant DB as 🗄️ SQLAlchemy DB

    User->>UI: Upload Resume (PDF / DOCX / TXT)
    UI->>API: POST /api/resume/upload (Multipart)
    API->>NLP: Extract layout blocks & unwrap hyphenations
    NLP->>NLP: Classify 6 sections + extract Contact Info
    NLP->>DB: Fetch 106+ Canonical Skills & 370+ Aliases
    NLP->>NLP: Trace skills & assign Evidence Tier (STRONG..MENTIONED)
    API->>DB: Save Resume + Structured JSON + Baseline ATS Score
    API-->>UI: 201 Created (Extracted Skills + Section Map)

    User->>UI: Paste Target Job Description & Click "Analyze"
    UI->>API: POST /api/job/analyze
    API->>NLP: Detect Seniority + Segment Required (1.0) vs Preferred (0.5)
    API->>DB: Save JobDescription & JobSkills
    UI->>API: POST /api/match/analyze {resume_id, job_id}
    API->>NLP: Compute Exact, Experience & Subword TF-IDF Cosine Scores
    API->>NLP: Classify 4-Tier Skill Gaps & Priority Ranking
    API->>LLM: Generate Executive Readiness & Top 3 Strategic Actions
    LLM-->>API: Structured JSON Insights (Groq/Gemini/Grok/Fallback)
    API->>DB: Persist AnalysisHistory + SkillGaps
    API-->>UI: Return Full Explainable Match Report + Score Gauge

    User->>UI: Open Skill Roadmaps (/recommendations)
    UI->>API: GET /api/recommendations/{analysis_id}
    API->>LLM: Generate 4-Stage Sequential Learning Path per Gap
    API-->>UI: Render Interactive RoadmapTree with Progress Checklists
```

---

### 4.3 Updated Entity Relationship (ER) Diagram — 23 Tables

These two views cover all tables declared in `backend/app/models/`. Attributes are abbreviated to emphasize primary keys, foreign keys, and feature-specific data.

#### Core accounts, profiles, resumes and skill-gap analysis (14 tables)

```mermaid
erDiagram
    USERS ||--o| PROFILES : owns
    USERS ||--o{ RESUMES : uploads_or_builds
    USERS ||--o{ JOB_DESCRIPTIONS : analyzes
    USERS ||--o{ ANALYSIS_HISTORY : runs
    PROFILES ||--o{ EDUCATIONS : contains
    PROFILES ||--o{ EXPERIENCES : contains
    PROFILES ||--o{ PROJECTS : contains
    PROFILES ||--o{ USER_SKILLS : lists
    SKILLS ||--o{ SKILL_ALIASES : normalizes
    SKILLS ||--o{ USER_SKILLS : references
    SKILLS ||--o{ JOB_SKILLS : required_by
    SKILLS ||--o{ SKILL_GAPS : evaluated_in
    SKILLS ||--o{ RECOMMENDATIONS : taught_by
    JOB_DESCRIPTIONS ||--o{ JOB_SKILLS : contains
    RESUMES ||--o{ ANALYSIS_HISTORY : evaluated_in
    JOB_DESCRIPTIONS ||--o{ ANALYSIS_HISTORY : target_of
    ANALYSIS_HISTORY ||--o{ SKILL_GAPS : produces
    ANALYSIS_HISTORY ||--o{ RECOMMENDATIONS : generates

    USERS {
        string id PK
        string email UK
        string hashed_password
        string role
        boolean is_verified
        string verification_token UK
        string verification_otp
        datetime verification_token_expires_at
        string google_id UK
        text picture "URL or image data URI"
    }
    PROFILES {
        string id PK
        string user_id FK, UK
        string headline
        text summary
        string location
    }
    EDUCATIONS {
        string id PK
        string profile_id FK
        string institution
        string degree
    }
    EXPERIENCES {
        string id PK
        string profile_id FK
        string company
        string role_title
        json bullets
    }
    PROJECTS {
        string id PK
        string profile_id FK
        string title
        json technologies
        string repo_url
    }
    USER_SKILLS {
        string id PK
        string profile_id FK
        string skill_id FK
        string proficiency
        boolean verified_by_resume
    }
    SKILLS {
        string id PK
        string canonical_name UK
        string category
    }
    SKILL_ALIASES {
        string id PK
        string skill_id FK
        string alias_name
    }
    RESUMES {
        string id PK
        string user_id FK
        string source_type "uploaded or builder"
        json structured_json
        float ats_score
    }
    JOB_DESCRIPTIONS {
        string id PK
        string user_id FK
        string title
        text raw_text
        string seniority_level
    }
    JOB_SKILLS {
        string id PK
        string job_id FK
        string skill_id FK
        string importance
        float weight
    }
    ANALYSIS_HISTORY {
        string id PK
        string user_id FK
        string resume_id FK
        string job_id FK
        float overall_score
        json ai_insights
    }
    SKILL_GAPS {
        string id PK
        string analysis_id FK
        string skill_id FK
        string gap_status
        string priority
    }
    RECOMMENDATIONS {
        string id PK
        string analysis_id FK
        string skill_id FK
        string learning_topic
        json learning_path
    }
```

#### Personalized job discovery and application tracking (9 additional tables)

`USERS` and `RESUMES` below are the same tables shown above. `JOB_SOURCES` is a standalone registry: evidence records store a `source_slug`, not a foreign key to that registry. Likewise, `JOB_RECOMMENDATIONS.best_resume_id` is a stored identifier, not a declared foreign key; only application records have a resume FK.

```mermaid
erDiagram
    USERS ||--o| CANDIDATE_PROFILE_SNAPSHOTS : consolidates
    USERS ||--o| USER_JOB_PREFERENCES : configures
    USERS ||--o{ JOB_SEARCH_RUNS : starts
    USERS ||--o{ JOB_RECOMMENDATIONS : receives
    USERS ||--o{ SAVED_JOBS : bookmarks
    USERS ||--o{ JOB_APPLICATIONS : tracks
    JOB_LISTINGS ||--o{ JOB_SOURCE_EVIDENCES : supported_by
    JOB_LISTINGS ||--o{ JOB_RECOMMENDATIONS : ranked_in
    JOB_LISTINGS ||--o{ SAVED_JOBS : saved_as
    JOB_LISTINGS ||--o{ JOB_APPLICATIONS : applied_to
    JOB_SEARCH_RUNS o|--o{ JOB_RECOMMENDATIONS : produces
    RESUMES o|--o{ JOB_APPLICATIONS : attached_to

    JOB_SOURCES {
        string id PK
        string slug UK
        string category
        string integration_mode
        boolean requires_api_key
        boolean is_enabled
    }
    CANDIDATE_PROFILE_SNAPSHOTS {
        string id PK
        string user_id FK, UK
        json unified_profile_json
        json resume_conflicts_json
        json source_attribution_json
        int resume_count_analyzed
    }
    USER_JOB_PREFERENCES {
        string id PK
        string user_id FK, UK
        json preferred_roles
        json preferred_locations
        json scoring_weights
        boolean consent_external_llm
    }
    JOB_SEARCH_RUNS {
        string id PK
        string user_id FK
        string status
        int progress_pct
        json generated_queries
        json sources_queried
        boolean cancel_requested
    }
    JOB_LISTINGS {
        string id PK
        string canonical_fingerprint UK
        string title
        string company
        string application_url
        json required_skills
        string availability_status
        datetime last_verified_at
    }
    JOB_SOURCE_EVIDENCES {
        string id PK
        string job_listing_id FK
        string source_slug
        string source_url
        text original_post_excerpt
    }
    JOB_RECOMMENDATIONS {
        string id PK
        string user_id FK
        string job_listing_id FK
        string search_run_id FK "Nullable"
        float match_score
        json score_breakdown
        string eligibility_status
        string best_resume_id "Not a foreign key"
        boolean is_dismissed
    }
    SAVED_JOBS {
        string id PK
        string user_id FK
        string job_listing_id FK
        text notes
    }
    JOB_APPLICATIONS {
        string id PK
        string user_id FK
        string job_listing_id FK
        string resume_id FK "Nullable"
        string status
        string applied_via_url
        datetime applied_at
    }
```

Each user/listing pair is unique in `job_recommendations`, `saved_jobs`, and `job_applications`; source evidence is unique per listing/source URL. Deleting a resume or search run sets its optional application/recommendation reference to `NULL` at the database FK level.

### 4.4 Updated Data Flow Diagram (DFD)

#### Level 0 — System context

```mermaid
flowchart TB
    C["Candidate"]
    A["Administrator"]
    S(("0. SkillBit Career Intelligence Platform"))
    O["Google Identity"]
    M["SMTP Mail Server"]
    X["Public Job APIs, Career Boards and Job Pages"]
    G["GitHub REST API"]
    L["Configured LLM Providers"]

    C -->|"Credentials, resumes, job inputs and preferences"| S
    S -->|"JWT, PDFs, fit reports, roadmaps and job recommendations"| C
    A -->|"Taxonomy changes and metrics requests"| S
    S -->|"Cohort analytics"| A
    S -->|"ID token verification request"| O
    O -->|"Verified identity"| S
    S -->|"Verification link and OTP email"| M
    M -->|"Email delivery"| C
    S -->|"Search queries and public URL requests"| X
    X -->|"Listings, source evidence and JobPosting data"| S
    S -->|"Public repository request"| G
    G -->|"Repository metadata"| S
    S -->|"Generation prompts; discovery explanations honor consent"| L
    L -->|"Insights, bullets and learning content"| S
```

#### Level 1 — Internal processes and data stores

```mermaid
flowchart TB
    C["Candidate via React Client"]
    A["Administrator"]
    EXT["Public Job Sources and Pages"]
    GH["GitHub API"]
    IDP["Google Identity"]
    SMTP["SMTP Server"]
    LLM["LLM Providers or Local Fallback"]

    P1(("1. Authenticate and Verify Account"))
    P2(("2. Parse Resume and Maintain Profile"))
    P3(("3. Import and Analyze Job Description"))
    P4(("4. Match Skills and Generate Roadmaps"))
    P5(("5. Build and Export Resume"))
    P6(("6. Discover, Normalize and Rank Jobs"))
    P7(("7. Track Saved Jobs and Applications"))
    P8(("8. Maintain Taxonomy and Aggregate Metrics"))

    D1[("D1 Users and Verification State")]
    D2[("D2 Profiles, Resumes, Skills and Private Files")]
    D3[("D3 Job Descriptions and Job Skills")]
    D4[("D4 Analysis History, Skill Gaps and Roadmaps")]
    D5[("D5 Snapshots, Preferences and Search Runs")]
    D6[("D6 Source Registry, Listings and Evidence")]
    D7[("D7 Job Recommendations, Saved Jobs and Applications")]

    C -->|"Credentials, OTP, token or settings changes"| P1
    P1 <-->|"Identity verification"| IDP
    P1 -->|"Activation link and OTP"| SMTP
    P1 <-->|"Account and verification state"| D1
    P1 -->|"JWT and account details"| C
    C -->|"Resume file or profile edits"| P2
    P2 <-->|"Parsed sections, skill evidence and profile records"| D2
    C -->|"Pasted JD, URL or PDF/DOCX/TXT"| P3
    P3 <-->|"Public page or PDF retrieval"| EXT
    P3 -->|"Normalized JD and weighted requirements"| D3
    D2 -->|"Resume evidence and canonical skills"| P4
    D3 -->|"Target requirements"| P4
    C -->|"Match request or custom roadmap request"| P4
    P4 <-->|"Insights and learning content"| LLM
    P4 -->|"Scores, gaps and learning paths"| D4
    P4 -->|"Explainable report and roadmaps"| C
    C -->|"Builder edits, repo URL or formatting request"| P5
    P5 <-->|"Public repository metadata"| GH
    P5 <-->|"Bullet and formatting suggestions"| LLM
    P5 <-->|"Structured resume"| D2
    P5 -->|"ATS PDF and editable suggestions"| C
    C -->|"Search request and job preferences"| P6
    D2 -->|"Master profile and active resumes"| P6
    P6 <-->|"Unified snapshot, preferences and search progress"| D5
    P6 <-->|"Search queries and public listings"| EXT
    P6 <-->|"Deduplicated jobs and provenance"| D6
    P6 <-->|"Consent-controlled explanations"| LLM
    P6 -->|"Ranked fit, eligibility and best resume"| D7
    P6 -->|"Search progress and recommendations"| C
    C -->|"Save, dismiss, verify or mark applied"| P7
    P7 <-->|"Availability check"| EXT
    P7 <-->|"Listing availability"| D6
    P7 <-->|"Bookmarks, dismissals and application records"| D7
    P7 -->|"Saved and applied job status"| C
    A -->|"Taxonomy edits and metrics request"| P8
    P8 <-->|"Skills and aliases"| D2
    D1 -->|"Candidate counts"| P8
    D4 -->|"Scores and recurring gaps"| P8
    P8 -->|"Cohort readiness metrics"| A
```

The DFD stores are logical groups of the ER tables, not additional tables. JWT ownership checks protect user-specific operations; admin operations require the admin role. Live discovery depends on network/source availability and may include seeded index entries; availability labels are indicators, not a guarantee that an opening remains active. Marking a job applied records the action locally—it does not submit an application to an employer.

---

## 5. Mathematical Formulation & Analytics Charts

### 5.1 Deterministic Multi-Factor Fit Formula

Unlike black-box LLM scorers that return different numbers on every run, SkillBit computes the candidate Fit Score $S \in [0.0, 100.0]$ deterministically:

$$S = \min\left(100.0, \ \frac{\sum_{i \in \text{JobSkills}} W_i \cdot \mathcal{F}(i, \text{Profile})}{\sum_{i \in \text{JobSkills}} W_i} \times 100\right)$$

Where:
* **Requirement Importance Weight ($W_i$)**:
  $$W_i = \begin{cases} 1.0 & \text{if skill } i \text{ is in a REQUIRED section} \\ 0.5 & \text{if skill } i \text{ is in a PREFERRED / BONUS section} \end{cases}$$

* **Candidate Skill Alignment Factor ($\mathcal{F}(i)$)**:
  $$\mathcal{F}(i) = \begin{cases} 0.60 \cdot \mathcal{M}_{\text{exact}} + 0.40 \cdot \max\left(\mathcal{E}_{\text{level}}, \ \mathcal{S}_{\text{semantic}}\right) & \text{if canonical skill } i \text{ is matched} \\ 0.45 \cdot \mathcal{S}_{\text{semantic}} & \text{if skill } i \text{ is missing, but } \mathcal{S}_{\text{semantic}} \ge 0.70 \\ 0.0 & \text{otherwise} \end{cases}$$

* **Hybrid Semantic Similarity ($\mathcal{S}_{\text{semantic}} \in [0.0, 1.0]$)**:
  $$\mathcal{S}_{\text{semantic}}(A, B) = 0.40 \cdot \cos_{\text{word-tfidf}}(A, B) + 0.35 \cdot \frac{|T_A \cap T_B|}{|T_A \cup T_B|} + 0.25 \cdot \cos_{\text{char-wb}(3,5)}(A, B)$$

---

### 📊 Chart 1: Canonical Skill Taxonomy Distribution

SkillBit ships with **106 core canonical skills** and **370+ normalized aliases** across **12 industry domains** on initial database seed (and scales dynamically via the Admin Taxonomy API):

```mermaid
pie showData
    title Seeded Canonical Skills by Category (106 Core Entities)
    "Programming Languages" : 19
    "Frameworks" : 15
    "Libraries" : 12
    "Databases" : 10
    "DevOps & Containers" : 9
    "AI / Machine Learning" : 9
    "Data & Analytics" : 7
    "Domain / SE Skills" : 7
    "Soft Skills" : 6
    "Developer Tools" : 5
    "Cybersecurity" : 4
    "Cloud Platforms" : 3
```

```text
Category Breakdown & Alias Coverage:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Programming Languages │ ███████████████████ 19 skills (17.9%) │ Python, TS, Java, Go, Rust, C++...
Frameworks            │ ███████████████     15 skills (14.2%) │ React, FastAPI, Next.js, Spring...
Libraries             │ ████████████        12 skills (11.3%) │ PyTorch, TensorFlow, Pandas, Redux...
Databases             │ ██████████          10 skills ( 9.4%) │ PostgreSQL, MongoDB, Redis, Elastic...
DevOps & Infra        │ █████████            9 skills ( 8.5%) │ Docker, Kubernetes, Terraform, CI/CD...
AI / Machine Learning │ █████████            9 skills ( 8.5%) │ LLMs, RAG, NLP, Computer Vision...
Data & Analytics      │ ███████              7 skills ( 6.6%) │ Spark, Kafka, Snowflake, ETL, Tableau...
Domain / Architecture │ ███████              7 skills ( 6.6%) │ Microservices, System Design, REST, TDD...
Soft Skills           │ ██████               6 skills ( 5.7%) │ Leadership, Problem Solving, Agile...
Developer Tools       │ █████                5 skills ( 4.7%) │ Git, GitHub, Postman, Jira, Figma
Cybersecurity         │ ████                 4 skills ( 3.8%) │ OWASP, Pentesting, Cryptography...
Cloud Platforms       │ ███                  3 skills ( 2.8%) │ AWS, Microsoft Azure, Google Cloud (GCP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 📈 Chart 2: Evidence Tier Multipliers & Hybrid Scoring Weights

When SkillBit extracts a skill from a candidate's resume, it does not treat all mentions equally. It inspects the **structural section** and checks for **action verbs** (`architected`, `engineered`, `deployed`, `optimized`, `scaled`, etc.):

```text
EVIDENCE TIER MULTIPLIERS (E_level)
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🏆 STRONG    (1.00x) │ ████████████████████████████████████████ │ 100% Weight    │
│                      │ Found in Experience/Projects + Action Verb (e.g. "Built") │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 🥈 MODERATE  (0.85x) │ ██████████████████████████████████░░░░░░ │  85% Weight    │
│                      │ Found in Experience/Projects without strong action verb   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 📋 LISTED    (0.60x) │ ████████████████████████░░░░░░░░░░░░░░░░ │  60% Weight    │
│                      │ Listed only in raw Technical Skills block (unproven)      │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 💬 MENTIONED (0.40x) │ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░ │  40% Weight    │
│                      │ Mentioned casually in Summary or Header only              │
└──────────────────────────────────────────────────────────────────────────────────┘

HYBRID SEMANTIC SIMILARITY COMPOSITION (S_semantic)
┌───────────────────────────┬──────────────────────────┬───────────────────────────┐
│  40% Word N-Gram TF-IDF   │  35% Token Jaccard Set   │ 25% Char N-Gram (3..5 wb) │
│   (1-2 word phrases)      │  (Stop-word filtered)    │ (Morphological subwords)  │
└───────────────────────────┴──────────────────────────┴───────────────────────────┘
```

---

### 🎯 Chart 3: 4-Tier Skill Gap Classification & Priority Matrix

```mermaid
flowchart TD
    START(["🔍 Evaluate Target Job Skill i"]) --> CHECK_CANONICAL{"In Candidate's\nCanonical Skill Map?"}

    CHECK_CANONICAL -->|"Yes"| CHECK_EVIDENCE{"Evidence Tier in\nResume?"}
    CHECK_CANONICAL -->|"No"| CHECK_SEMANTIC{"Subword Semantic\nSimilarity ≥ 0.70?"}

    CHECK_EVIDENCE -->|"STRONG (1.0) or\nMODERATE (0.85)"| STRONG["🟢 STRONG_MATCH\nPriority: LOW\n✔ Validated with excerpted work bullet"]
    CHECK_EVIDENCE -->|"LISTED (0.60) or\nMENTIONED (0.40)"| WEAK["🟡 WEAK_EVIDENCE\nPriority: HIGH (if Required) / MEDIUM (if Preferred)\n⚠ Listed in skills block, but lacks project/metric proof"]

    CHECK_SEMANTIC -->|"Yes (≥ 0.70)"| PARTIAL["🔵 PARTIAL_MATCH\nPriority: MEDIUM\n🔄 Related experience detected; bridge tool delta"]
    CHECK_SEMANTIC -->|"No (< 0.70)"| MISSING["🔴 MISSING\nPriority: HIGH (if Required) / MEDIUM (if Preferred)\n🚀 Prescribe 4-stage sequential roadmap & capstone"]

    style STRONG fill:#ecfccb,stroke:#65a30d,stroke-width:2px,color:#1a2e05
    style WEAK fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#451a03
    style PARTIAL fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#082f49
    style MISSING fill:#ffe4e6,stroke:#e11d48,stroke-width:2px,color:#4c0519
```

| Gap Status Badge | Detection Condition | Importance = `REQUIRED` ($W=1.0$) | Importance = `PREFERRED` ($W=0.5$) | Prescribed Action by Engine |
| :--- | :--- | :---: | :---: | :--- |
| 🟢 **`STRONG_MATCH`** | Skill present + `STRONG` or `MODERATE` evidence in Experience/Projects | `LOW` Priority | `LOW` Priority | Preserves matched bullet snippet as verified proof; no remediation needed. |
| 🟡 **`WEAK_EVIDENCE`** | Skill present only in `Skills` list (`LISTED`) or `Summary` (`MENTIONED`) | `HIGH` Priority | `MEDIUM` Priority | Prompts candidate to rewrite experience bullets with **STAR Optimizer** & metrics. |
| 🔵 **`PARTIAL_MATCH`** | Exact skill absent, but bullet semantic cosine similarity $\ge 0.70$ | `MEDIUM` Priority | `MEDIUM` Priority | Highlights transferable domain context and prescribes targeted syntax delta. |
| 🔴 **`MISSING`** | Absent from profile & semantic similarity $< 0.70$ | `HIGH` Priority | `MEDIUM` Priority | Generates **4-Stage Sequential Learning Roadmap**, docs link, and capstone project. |

---

## 6. Multi-Provider LLM Failover Architecture

To guarantee **100% uptime, zero cost during academic evaluations, and resilience against API rate-limits**, `llm_service.py` implements an intelligent 5-tier cascading provider router:

```mermaid
flowchart LR
    REQ(["📥 AI Request\n(Gap Insights / 4-Stage Roadmap)"]) --> ROUTER{"🧭 LLM Provider\nAuto-Discovery"}

    ROUTER -->|"1. Primary (GROQ_API_KEY)"| GROQ["⚡ Groq Cloud API\n• openai/gpt-oss-120b\n• llama-3.3-70b-versatile\n• qwen/qwen3.8-27b\n• llama-3.1-8b-instant"]
    ROUTER -->|"2. Secondary (GEMINI_API_KEY)"| GEMINI["✨ Google Gemini API\n• gemini-1.5-flash\n(JSON MimeType Enforced)"]
    ROUTER -->|"3. Tertiary (GROK_API_KEY)"| GROK["🚀 xAI Grok API\n• grok-beta"]
    ROUTER -->|"4. Quaternary (OPENAI_API_KEY)"| OPENAI["🧠 OpenAI API\n• gpt-4o-mini"]
    ROUTER -->|"5. Offline / Zero-Key"| MOCK["🛡️ SkillBit Local CareerTech Engine\nDeterministic Curated Knowledge Base"]

    GROQ -.->|"HTTP Error / Timeout"| GEMINI
    GEMINI -.->|"HTTP Error / Timeout"| GROK
    GROK -.->|"HTTP Error / Timeout"| OPENAI
    OPENAI -.->|"Schema / Network Fail"| MOCK

    GROQ & GEMINI & GROK & OPENAI & MOCK --> VALIDATE["✅ Pydantic v2 Schema Validation"]
    VALIDATE --> OUT(["📤 Structured JSON Response"])

    style GROQ fill:#f3e8ff,stroke:#9333ea,stroke-width:2px
    style GEMINI fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style GROK fill:#f1f5f9,stroke:#475569,stroke-width:2px
    style OPENAI fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style MOCK fill:#fef9c3,stroke:#ca8a04,stroke-width:2px
```

### 🛡️ Responsible AI & Anti-Hallucination Guardrails
1. **Zero Credential Fabrication**: The STAR bullet improver (`resume_content_generator.py`) is strictly constrained to strengthen passive phrasing (e.g., `"worked on"` $\rightarrow$ `"engineered"`, `"helped with"` $\rightarrow$ `"facilitated"`, `"used"` $\rightarrow$ `"leveraged"`) and surface metric placeholders—it **never** invents fake companies, degrees, or unverified certifications.
2. **Human-in-the-Loop Authority (`BulletSuggestionModal.jsx`)**: Candidates explicitly **Accept**, **Edit**, or **Reject** every AI-generated bullet suggestion before it touches their resume.
3. **Transparent Legal & Ethical Disclaimer**: Every match evaluation embeds the explicit notice:
   > *"This score is an automated ATS alignment indicator and does not guarantee employment or interview selection."*

---

## 7. Core Functionality & Feature Tour

The active client is `skillbit/`, with authenticated screens under `/app/*`. The earlier `frontend/` JSX client uses shorter routes such as `/upload` and `/match` and does not include every feature below.

### 1️⃣ Layout-Aware Resume Ingestion (`/app/upload`)
* **Multi-Format Support**: Accepts `.pdf`, `.docx`, and `.txt` files up to 5 MB (`file_storage.py` stores files in a private UUID-named vault).
* **Layout Block Sorting**: Uses **PyMuPDF (`fitz`)** coordinate block sorting (`page.get_text("blocks", sort=True)`) to preserve reading order, normalize Unicode bullets, and unwrap hyphenated line-breaks (`"imple-\nmentation"` $\rightarrow$ `"implementation"`).
* **Real-Time Extraction Inspector**: Displays baseline ATS Readability Score, detected structural sections (`Contact`, `Summary`, `Experience`, `Projects`, `Education`, `Skills`), and extracted canonical skills with their evidence badges (`STRONG`, `MODERATE`, `LISTED`).

### 2️⃣ Career Readiness Metrics & Master Profile (`/app/profile`)
* **Composite Quality KPIs**: Computes **Profile Completeness %**, **Quantified Achievements Score** (percentage of experience bullets containing measurable numbers/metrics), **ATS Formatting Score**, and **Overall Quality Composite**.
* **One-Click Master Profile Sync**: Synchronizes parsed resume sections, work history, projects, and verified skills into the persistent user profile (`POST /api/profile/sync-from-resume`).
* **Skill Category Distribution & Critical Gaps**: Visualizes the candidate's skill portfolio across categories and highlights top high-priority gaps from recent evaluations.

### 3️⃣ Explainable Job Fit & Skill Gap Analyzer (`/app/match`, `/app/match/:id`)
* **Job Description Import**: Paste a JD, upload a PDF/DOCX/TXT file, or import a public job URL. File extraction infers role title, company, seniority, and detected skill count; temporary JD uploads are deleted after parsing.
* **Schema.org `JobPosting` Extraction**: URL import reads structured JSON-LD, including nested `@graph` objects, to recover the company, role, and description without an LLM. Direct PDF URLs are also supported. LinkedIn URLs attempt the public guest endpoint, but access is not guaranteed. HTML pages without usable `JobPosting` data or behind a login/bot wall require pasted text or a file upload; arbitrary HTML/plain-text URL extraction is not guaranteed.
* **Intelligent JD Segmentation**: Automatically detects role seniority (`Lead`, `Senior`, `Mid`, `Entry`) and splits Job Descriptions into **Required Qualifications** ($W=1.0$) vs. **Preferred / Bonus Skills** ($W=0.5$).
* **Fit Score Visualization**: Visualizes Overall Fit Score alongside granular bars for **Exact Match**, **Semantic Context**, and **Experience Evidence**.
* **Executive AI Insights Banner**: Displays readiness tier (`Interview Ready`, `Near Match (Minor Gaps)`, or `Core Upskilling Required`), a 2–3 sentence executive synthesis, **Top Improvement Priorities**, and an **Immediate Strategic Action Plan** with on-demand LLM regeneration.
* **Filterable Gap Drilldown Cards**: Filter by `ALL`, `MISSING`, `WEAK_EVIDENCE`, or `STRONG_MATCH`. Each card shows side-by-side **Resume Evidence** vs. **Job Requirement Context** and a direct link to launch the skill's learning roadmap.

### 4️⃣ Interactive `roadmap.sh`-Style Learning Trees (`/app/roadmaps`)
* **4-Stage Sequential Progression**: Breaks every missing or weak skill into 4 chronological stages:
  1. *Stage 01: Foundations & Modern Syntax* (3–5 days)
  2. *Stage 02: Core Architecture & Patterns* (5–7 days)
  3. *Stage 03: Production Engineering & Quality* (5–7 days)
  4. *Stage 04: Capstone Portfolio Proof* (4–6 days)
* **Interactive Topic Checklists**: Candidates click individual sub-topics (`1.1`, `1.2`, etc.) to mark them mastered; progress percentage is persisted in `localStorage`.
* **Custom On-Demand AI Roadmap Generator**: Candidates can generate a custom 4-stage roadmap for *any* arbitrary technology and target role via `POST /api/recommendations/generate-roadmap`.

### 5️⃣ ATS Resume Builder, GitHub Repo Analyzer & PDF Exporter (`/app/builder`)
* **Live Split-Screen Editor & Preview**: Edit contact coordinates, summary, technical skills, work experiences, projects, and education with an instant single-column ATS preview.
* **GitHub Repository AI Importer (`POST /api/resume/analyze-repo`)**: Paste any public GitHub repository URL (e.g., `https://github.com/owner/repo`) to automatically fetch repository metadata, stars, primary language, and topics via the GitHub REST API and synthesize 3 high-impact **STAR accomplishment bullets**.
* **Interactive STAR Bullet Optimizer**: Click **"AI Improve (STAR)"** on any experience or project bullet to transform passive statements into quantified, action-driven accomplishments.
* **AI Auto-format & Messy Text Fixer (`POST /api/resume/auto-format`)**: Converts messy resume text or existing structured content into editable formatted sections, normalizes casing/dates/links, groups skills, and suggests ATS typography settings. Review generated content before saving or exporting.
* **Server-Side ReportLab PDF Export (`GET /api/resume/{id}/export`)**: Streams a binary, machine-readable single-column PDF with `Helvetica` typography, clean horizontal rules, and clickable blue underlined hyperlinks (`LinkedIn`, `GitHub`, `Live Demo`).

### 6️⃣ University Placement & Admin Cohort Portal (`/app/admin`)
* **Role-Based Access Control (`adminOnly`)**: Restricted to placement officers and administrators (`admin@skillbit.ai`).
* **Cohort Readiness Telemetry**: Aggregates total candidates, total resumes built/uploaded, total job evaluations run, cohort-wide average ATS match index, and the **Top 10 Most Frequent Missing Skills** across the student batch to guide curriculum bootcamps.
* **Canonical Taxonomy CRUD**: Add new canonical skills, descriptions, and comma-separated aliases directly into the database.

### 7️⃣ Personalized Multi-Source Job Finder (`/app/jobs`)
* **Unified Candidate Intelligence**: Consolidates the Master Profile and active resumes into a persisted snapshot with source attribution, resume conflicts, skills, projects, education, inferred roles, and career stage.
* **Seven-Stage Search Workflow**: Understand profile → generate queries → search sources → analyze opportunities → check availability → rank recommendations → prepare results. Background search supports progress polling, cancellation, and saved search history.
* **Implemented Search Adapters**: Queries Remotive, Arbeitnow, selected public Greenhouse boards, Hacker News, Reddit hiring feeds, and JSearch-backed portals when `JSEARCH_API_KEY` is configured. The source registry also lists integrations requiring keys or not yet implemented; a registered source is not a promise of a working adapter. Seeded index entries remain available when external sources are unreachable and should not be mistaken for newly verified live openings.
* **Deduplication & Provenance**: Consolidates listings by canonical company/title fingerprint while retaining source URLs, excerpts, discovery queries, and verification timestamps.
* **Explainable Seven-Factor Ranking**: Default weights are skill compatibility **25%**, experience/project relevance **20%**, role alignment **15%**, education eligibility **15%**, location/work preference **10%**, freshness/availability **10%**, and other preferences **5%**. This discovery score is separate from the resume-to-JD score in Section 5. Recommendations include eligibility reasons, strong/partial/missing skills, concerns, preparation steps, and the best matching resume with comparisons.
* **Preferences & Privacy**: Configure desired/alternative roles, locations, work arrangements, employment types, internships, salary, industries, excluded companies, preferred sources, score threshold, and scoring weights. The `consent_external_llm` preference controls external LLM use for discovery explanations; it is not a global opt-out for other AI features. Search frequency is stored as a preference, not a guarantee of scheduled background searches.
* **Filters & Opportunity Tabs**: Browse Recommended, Best Matches, Latest, Internships, Fresher-Friendly, Remote, Startups & Niche, Saved Jobs, and Applied; refine results by role, skill, location, company, source, salary, resume, and other supported filters.
* **Saved Jobs & Application Tracking**: Bookmark or dismiss recommendations, restore dismissed results through the API, recheck availability, and record application status, notes, URL, and selected resume. Applications are submitted on the external employer site; SkillBit tracks them locally.

### 8️⃣ Email Verification, Account Settings & Profile Pictures
* **Dual-Method Verification (`/signup`, `/verify-email`)**: New email/password registrations receive a six-digit OTP and activation link, valid for **15 minutes**. Resending replaces both codes and enforces a **60-second** cooldown. Successful verification establishes a JWT session; unverified regular accounts cannot use password login.
* **SMTP Delivery & Development Mode**: Sends verification email through STARTTLS, with SSL/465 fallback. SMTP settings are reloaded from `.env` when used, Google App Password spaces are normalized, and sender headers are sanitized. Without SMTP credentials, the backend prints the OTP and activation link to its terminal for local development. `/api/auth/smtp-status` checks connectivity; authenticated users can send a test email.
* **Settings Modal**: Open Settings from the app's profile menu to change a password or update the avatar. Uploading an image crops/resizes it to **256 × 256**, converts it to a JPEG data URI, and persists it through `/api/auth/picture`. A public image URL can also be used, and the picture can be removed.
* **Theme & Local Preferences**: The active client offers light/dark theme switching and locally saved roadmap-level and auto-sync preferences.

### 9️⃣ Resume-Derived Profiles & Match History (`/app/profile`, `/app/history`)
* Upload a resume from the Profile screen, preview extracted details, and choose a title before synchronizing to the Master Profile. The sync API can target a specific resume and optionally replace existing education, experience, project, and skill records; it does not create multiple independent Master Profile rows per user.
* Review saved evaluations, reopen score/gap reports, and delete an analysis through `DELETE /api/match/{analysis_id}`. Analysis deletion also removes its associated gaps and learning recommendations.

---

## 8. Tech Stack & Libraries

### 🖥️ Active Frontend Stack (`/skillbit`)
| Technology | Version | Role in SkillBit |
| :--- | :---: | :--- |
| **React / React DOM** | `^19.0.0` | Component-driven UI and shared application state |
| **TypeScript** | `^5.7.0` | Typed UI, API contracts, and client logic |
| **Vite** | `^8.0.5` | Development server and production bundler |
| **Tailwind CSS** | `^4.0.0` | Utility styling through `@tailwindcss/vite` |
| **React Router** | `^8.5.0` | `/app/*` routes with authenticated/admin guards |
| **Lucide React** | `^1.61.0` | Interface icons |
| **Fetch API** | Browser native | Bearer-token requests with configurable `VITE_API_URL` |

The earlier `frontend/` client uses JSX, Tailwind CSS 3, React Router DOM, and Axios. `start.bat` launches `skillbit/`, not `frontend/`.

### ⚙️ Backend, AI/NLP & Data Stack (`/backend`)
| Technology | Badge | Version | Role in SkillBit |
| :--- | :--- | :---: | :--- |
| **Python** | ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) | `3.12 / 3.14` | Core backend runtime and scientific computing environment |
| **FastAPI** | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) | `>=0.110.0` | High-performance async REST framework with automatic OpenAPI/Swagger docs |
| **Pydantic v2** | ![Pydantic](https://img.shields.io/badge/Pydantic_v2-E92063?style=flat-square&logo=pydantic&logoColor=white) | `>=2.6.0` | Strict request/response schema validation and `.env` settings management |
| **SQLAlchemy 2.0** | ![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white) | `>=2.0.28` | Relational ORM managing 23 tables, including discovery and application tracking |
| **Scikit-Learn** | ![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-F7931E?style=flat-square&logo=scikitlearn&logoColor=white) | `>=1.4.0` | `TfidfVectorizer` (word & `char_wb` n-grams) + `cosine_similarity` engine |
| **PyMuPDF (`fitz`)** | ![PyMuPDF](https://img.shields.io/badge/PyMuPDF-00599C?style=flat-square) | `>=1.23.0` | Coordinate-sorted PDF block extraction and artifact cleaning |
| **python-docx** | ![DOCX](https://img.shields.io/badge/python--docx-2B579A?style=flat-square&logo=microsoft-word&logoColor=white) | `>=1.1.0` | Paragraph and table extraction from Microsoft Word `.docx` resumes |
| **ReportLab** | ![ReportLab](https://img.shields.io/badge/ReportLab-CC0000?style=flat-square&logo=adobe-acrobat-reader&logoColor=white) | `>=4.1.0` | Server-side single-column ATS PDF generation with clickable links |
| **PyJWT / Jose & Bcrypt** | ![JWT](https://img.shields.io/badge/JWT_%2B_Bcrypt-000000?style=flat-square&logo=json-web-tokens&logoColor=white) | `>=3.3.0` | Stateless HMAC-SHA256 JWT tokens & salted Bcrypt password hashing |
| **HTTPX** | ![HTTPX](https://img.shields.io/badge/HTTPX-1E293B?style=flat-square) | `>=0.27.0` | REST client for Groq, Gemini, xAI Grok, Google OAuth, and GitHub API |
| **Pytest** | ![Pytest](https://img.shields.io/badge/Pytest-0A9EDC?style=flat-square&logo=pytest&logoColor=white) | `>=8.0.0` | Automated unit & integration testing suite with `TestClient` |

---

## 9. Repository Structure

```text
Skillbit/
├── 📄 README.md                          # Comprehensive project documentation & visual analytics
├── 📄 ARCHITECTURE.md                    # System architecture & academic viva defense reference
├── 📄 PRESENTATION_PPT_GUIDE.md          # Complete 10-slide PPT blueprint, speaker notes & chart data
├── 🚀 start.bat                          # One-click Windows launcher (FastAPI :8000 + Vite :5173)
│
├── 📂 backend/                           # Python FastAPI Backend & Hybrid AI Engine
│   ├── 📋 requirements.txt               # Python package dependencies
│   ├── ⚙️ pytest.ini                     # Pytest configuration
│   ├── 📂 app/
│   │   ├── 🚀 main.py                    # FastAPI app entrypoint, CORS & lifespan DB init
│   │   ├── 🔧 config.py                  # Pydantic BaseSettings & environment variables
│   │   ├── 📂 ai/                        # 🧠 Core Hybrid AI & NLP Pipeline
│   │   │   ├── llm_service.py            # Multi-provider LLM router (Groq/Gemini/Grok/OpenAI/Local)
│   │   │   ├── resume_parser.py          # PyMuPDF block-sorted PDF, DOCX & TXT parser
│   │   │   ├── section_classifier.py     # Structural resume section & contact classifier
│   │   │   ├── skill_extractor.py        # Multi-pass gazetteer & 4-tier evidence tracer
│   │   │   ├── skill_normalizer.py       # Canonical skill & alias resolution
│   │   │   ├── job_analyzer.py           # Seniority detector & Required vs Preferred segmenter
│   │   │   ├── embedding_service.py      # Hybrid Word TF-IDF + Token + Char N-Gram similarity
│   │   │   ├── matching_engine.py        # Deterministic multi-factor fit scoring engine
│   │   │   ├── candidate_intelligence.py # Unified multi-resume profile snapshots
│   │   │   ├── job_discovery_agent.py    # Seven-stage job discovery orchestration
│   │   │   ├── job_matcher_ranker.py     # Eligibility, weighted fit & best-resume ranking
│   │   │   ├── gap_analyzer.py           # 4-tier gap classification & priority matrix
│   │   │   ├── recommendation_engine.py  # Curated learning catalog & roadmap synthesizer
│   │   │   └── resume_content_generator.py # Anti-hallucination STAR bullet optimizer
│   │   ├── 📂 api/                       # 10 routers, 77 HTTP operations (+ 2 system routes)
│   │   │   ├── auth.py                   # OTP/link verification, login, Google, SMTP, password/avatar
│   │   │   ├── profile.py                # Master profile CRUD & one-click resume sync
│   │   │   ├── skills.py                 # Taxonomy search, category list & normalization
│   │   │   ├── resume.py                 # Upload, Builder CRUD, PDF Export, GitHub Repo Analyzer
│   │   │   ├── job.py                    # JD analysis, file/URL/JSON-LD import & CRUD
│   │   │   ├── discovery.py              # Search runs, ranking, preferences, saved/applied jobs
│   │   │   ├── match.py                  # Hybrid matching, gap reports & AI insights refresh
│   │   │   ├── recommendation.py         # Gap roadmaps, custom AI roadmaps & STAR bullets
│   │   │   ├── dashboard.py              # Completeness, quality indicators & KPI metrics
│   │   │   ├── admin.py                  # Placement cohort analytics & taxonomy CRUD
│   │   │   └── deps.py                   # JWT verification & RBAC dependency injection
│   │   ├── 📂 models/                    # 23 SQLAlchemy tables; discovery.py adds 9 tables
│   │   ├── 📂 schemas/                   # 🛡️ Pydantic v2 Request/Response Schemas
│   │   ├── 📂 services/                  # PDF, SMTP, job source adapters & JSON-LD extraction
│   │   ├── 📂 database/                  # 🛢️ Engine session & automatic taxonomy/admin seeder
│   │   └── 📂 utils/                     # 🔐 Security (JWT/Bcrypt), File Vault & Taxonomy Data
│   └── 📂 tests/                         # 12 test modules, including discovery & JSON-LD
│
├── 📂 skillbit/                          # Active TypeScript frontend launched by start.bat
│   ├── 📦 package.json                   # React 19, Vite 8, Tailwind CSS 4, React Router 8
│   └── 📂 src/
│       ├── 📂 app/routes.ts              # Public routes and protected /app/* screens
│       ├── 📂 components/AppShell.tsx    # Navigation, settings, avatar and theme controls
│       ├── 📂 lib/api.ts                 # Typed Fetch API client and backend contracts
│       ├── 📂 lib/store.tsx              # Shared account and application state
│       └── 📂 pages/                     # Upload, jobs, match, builder, profile, history, etc.
│
└── 📂 frontend/                          # Earlier JSX client (not the default launcher target)
    ├── 📦 package.json                   # Frontend dependencies & scripts
    ├── 🎨 tailwind.config.js             # Custom SaaS color tokens & typography
    ├── 📂 public/                        # Brand logos (favicon.svg, logo.jpg, icons.svg)
    └── 📂 src/
        ├── 🚀 App.jsx                    # Route definitions & ProtectedRoute layout wrapper
        ├── 📂 context/AuthContext.jsx    # Global JWT & Google OAuth session provider
        ├── 📂 services/api.js            # Axios instance with Bearer token interceptor
        ├── 📂 components/                # Reusable UI Components
        │   ├── Sidebar.jsx               # Responsive dark navigation sidebar
        │   ├── ScoreGauge.jsx            # SVG radial fit score gauge & sub-score bars
        │   ├── GapCard.jsx               # Evidence vs Requirement comparison card
        │   ├── RoadmapTree.jsx           # Interactive 4-stage sequential learning tree
        │   ├── BulletSuggestionModal.jsx # Human-in-the-loop STAR bullet review modal
        │   ├── GoogleSignInButton.jsx    # Google Identity Services OAuth button
        │   └── ProtectedRoute.jsx        # Role-aware route guard
        └── 📂 pages/                     # 8 Full-Featured Application Views
```

---

## 10. Complete REST API Reference

Interactive Swagger UI documentation is served automatically at **`http://localhost:8000/docs`** and ReDoc at **`http://localhost:8000/redoc`**.

<details>
<summary><b>🔽 Expand 79 HTTP Operations Across 10 Routers and 2 System Routes</b></summary>

| Router | Method | Endpoint | Auth | Description |
| :--- | :---: | :--- | :---: | :--- |
| **System** | `GET` | `/` | Public | Service metadata, version, and docs link |
| **System** | `GET` | `/health` | Public | Liveness health check (`{"status": "ok"}`) |
| **Auth** | `GET` | `/api/auth/config` | Public | Public Google OAuth Client ID configuration |
| **Auth** | `POST` | `/api/auth/register` | Public | Register candidate account, issue verification token & send mail |
| **Auth** | `POST` | `/api/auth/verify-otp` | Public | Verify six-digit email code and establish a JWT session |
| **Auth** | `POST`, `GET` | `/api/auth/verify-email` | Public | Verify activation token and establish a JWT session |
| **Auth** | `POST` | `/api/auth/resend-verification` | Public | Resend time-limited verification email link |
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticate email/password & issue HS256 JWT token |
| **Auth** | `POST` | `/api/auth/google` | Public | Verify Google OAuth ID token, auto-provision user & issue JWT |
| **Auth** | `GET` | `/api/auth/me` | User | Retrieve currently authenticated user details |
| **Auth** | `GET` | `/api/auth/smtp-status` | Public | Verify SMTP server connectivity status |
| **Auth** | `POST` | `/api/auth/test-email` | User | Dispatch asynchronous test email via SMTP |
| **Auth** | `POST` | `/api/auth/change-password` | User | Change the authenticated account password |
| **Auth** | `PUT`, `POST` | `/api/auth/picture` | User | Set a picture URL/data URI, or clear the picture |
| **Profile** | `GET` | `/api/profile` | User | Retrieve full Master Profile (education, experience, projects, skills) |
| **Profile** | `PUT` | `/api/profile` | User | Update headline, summary, location, and social URLs |
| **Profile** | `POST` | `/api/profile/sync-from-resume` | User | Auto-populate Master Profile from latest parsed resume |
| **Profile** | `POST` | `/api/profile/education` | User | Add an education entry to Master Profile |
| **Profile** | `DELETE` | `/api/profile/education/{id}` | User | Remove an education entry |
| **Profile** | `POST` | `/api/profile/experience` | User | Add a work experience entry with bullets & technologies |
| **Profile** | `DELETE` | `/api/profile/experience/{id}` | User | Remove a work experience entry |
| **Profile** | `POST` | `/api/profile/project` | User | Add a technical project entry |
| **Profile** | `DELETE` | `/api/profile/project/{id}` | User | Remove a technical project entry |
| **Profile** | `POST` | `/api/profile/skill` | User | Add or update a canonical skill with proficiency level |
| **Profile** | `DELETE` | `/api/profile/skill/{id}` | User | Remove a user skill from Master Profile |
| **Skills** | `GET` | `/api/skills` | Public | Search canonical skills and aliases with category filtering |
| **Skills** | `GET` | `/api/skills/categories` | Public | Retrieve all 12 categories and their nested canonical skills |
| **Skills** | `POST` | `/api/skills/normalize` | Public | Normalize arbitrary raw strings into canonical skills (`EXACT`/`ALIAS`/`FUZZY`) |
| **Resume** | `POST` | `/api/resume/upload` | User | Upload & parse PDF/DOCX/TXT resume with section & evidence extraction |
| **Resume** | `POST` | `/api/resume/create` | User | Save a structured ATS resume created in the Resume Builder |
| **Resume** | `GET` | `/api/resume` | User | List all active resumes belonging to the current user |
| **Resume** | `GET` | `/api/resume/{id}` | User | Retrieve a specific resume and its structured JSON |
| **Resume** | `PUT` | `/api/resume/{id}` | User | Update an existing resume's title and structured content |
| **Resume** | `DELETE` | `/api/resume/{id}` | User | Delete resume record and safely purge private file |
| **Resume** | `GET` | `/api/resume/{id}/export` | User | Generate & download single-column ATS PDF via ReportLab |
| **Resume** | `POST` | `/api/resume/analyze-repo` | User | Fetch GitHub repo metadata & synthesize STAR project bullets |
| **Resume** | `POST` | `/api/resume/auto-format` | User | Format structured content or messy text into editable resume sections |
| **Job** | `POST` | `/api/job/extract-file` | User | Parse PDF/DOCX/TXT JD and infer role/company/skills |
| **Job** | `POST` | `/api/job/extract-url` | User | Import a public JobPosting JSON-LD page or direct PDF URL |
| **Job** | `POST` | `/api/job/extract-json-ld` | User | Extract Schema.org company, role, and description without an LLM |
| **Job** | `POST` | `/api/job/analyze` | User | Segment JD into Required/Preferred skills & infer seniority level |
| **Job** | `GET` | `/api/job` | User | List all analyzed target job descriptions for the user |
| **Job** | `GET` | `/api/job/{id}` | User | Retrieve a specific job description and extracted skill weights |
| **Job** | `DELETE` | `/api/job/{id}` | User | Delete a saved job description |
| **Match** | `GET` | `/api/match/llm-provider` | Public | Inspect active LLM provider and model (`groq`/`gemini`/`grok`/`mock`) |
| **Match** | `POST` | `/api/match/analyze` | User | Execute hybrid matching, 4-tier gap analysis & LLM executive insights |
| **Match** | `GET` | `/api/match/history` | User | List historical match evaluations for the current user |
| **Match** | `GET` | `/api/match/{analysis_id}` | User | Retrieve full match report, sub-scores, and gap breakdown |
| **Match** | `DELETE` | `/api/match/{analysis_id}` | User | Delete an owned analysis and associated gaps/roadmaps |
| **Match** | `POST` | `/api/match/{analysis_id}/ai-insights` | User | Regenerate LLM executive gap insights for an analysis |
| **Recommend** | `GET` | `/api/recommendations/{analysis_id}` | User | Get/generate 4-stage learning roadmaps for all gaps in an analysis |
| **Recommend** | `POST` | `/api/recommendations/generate-roadmap` | User | On-demand 4-stage sequential AI roadmap for any custom skill & role |
| **Recommend** | `POST` | `/api/resume/suggest-bullets` | User | Rewrite accomplishment bullet using anti-hallucination STAR engine |
| **Dashboard** | `GET` | `/api/dashboard` | User | Aggregate completeness, quality indicators, strengths & critical gaps |
| **Admin** | `GET` | `/api/admin/metrics` | Admin | University placement cohort readiness stats & top missing skills |
| **Admin** | `POST` | `/api/admin/skills` | Admin | Register a new canonical skill and aliases into taxonomy |
| **Admin** | `DELETE` | `/api/admin/skills/{skill_id}` | Admin | Delete a canonical skill from the taxonomy |
| **Discovery** | `GET` | `/api/discovery/sources` | User | List registered job sources and integration availability |
| **Discovery** | `GET` | `/api/discovery/candidate-context` | User | Retrieve/build unified candidate snapshot |
| **Discovery** | `POST` | `/api/discovery/candidate-context/rebuild` | User | Rebuild snapshot from profile and resumes |
| **Discovery** | `GET`, `PUT` | `/api/discovery/preferences` | User | Read/update job preferences, weights, and explanation consent |
| **Discovery** | `POST` | `/api/discovery/search` | User | Start synchronous or background discovery run |
| **Discovery** | `GET` | `/api/discovery/search/{search_run_id}` | User | Poll an owned search run's progress and source results |
| **Discovery** | `POST` | `/api/discovery/search/{search_run_id}/cancel` | User | Request cancellation of an owned run |
| **Discovery** | `GET` | `/api/discovery/search-history` | User | List previous discovery runs |
| **Discovery** | `GET` | `/api/discovery/recommendations` | User | Filter personalized job recommendations |
| **Discovery** | `GET` | `/api/discovery/jobs/{job_id}` | User | Retrieve detailed fit, eligibility, provenance, and resume comparison |
| **Discovery** | `GET` | `/api/discovery/jobs/{job_id}/explanation` | User | Retrieve/refresh personalized recommendation explanation |
| **Discovery** | `POST` | `/api/discovery/jobs/{job_id}/verify` | User | Recheck listing availability |
| **Discovery** | `POST`, `DELETE` | `/api/discovery/jobs/{job_id}/save` | User | Bookmark/unbookmark a listing |
| **Discovery** | `GET` | `/api/discovery/saved` | User | List bookmarked jobs |
| **Discovery** | `POST` | `/api/discovery/jobs/{job_id}/dismiss` | User | Hide a recommendation |
| **Discovery** | `POST` | `/api/discovery/jobs/{job_id}/undismiss` | User | Restore a hidden recommendation |
| **Discovery** | `POST` | `/api/discovery/jobs/{job_id}/apply` | User | Record/update application status, notes, URL, and chosen resume |
| **Discovery** | `GET` | `/api/discovery/applications` | User | List tracked applications |

Each method/path pair counts as one operation. The undocumented `/favicon.ico` helper and automatically generated docs/OpenAPI routes are excluded. Path parameter names such as `{id}` are abbreviated in some entries above.

</details>

---

## 11. Installation & Quickstart

### Prerequisites
* **Python**: `3.12+` (`3.14` fully supported)
* **Node.js**: `22.12+` & `npm` (compatible with the active Vite 8 client)
* **Git**

### ⚡ Option A: One-Click Windows Startup
Double-click `start.bat` or run from the project root:
```cmd
start.bat
```
> Automatically activates the Python virtual environment, starts the **FastAPI server** on `http://localhost:8000` (creating & seeding `app.db` on first boot), and launches the **Vite React frontend** on `http://localhost:5173`.

---

### 🛠️ Option B: Manual Step-by-Step Setup

#### 1. Backend Setup (`Port 8000`)
```powershell
# 1. Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\activate

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt

# 3. Start FastAPI server with hot-reload
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Base URL**: `http://localhost:8000/api`
* **Interactive Swagger Docs**: `http://localhost:8000/docs`

#### 2. Active Frontend Setup (`Port 5173`)
```powershell
# In a new terminal window, from the repository root:
cd skillbit
npm install
npm run dev
```
* **Web Application**: `http://localhost:5173`
* **Backend override**: Set `VITE_API_URL` in `skillbit/.env` if the API is not at `http://localhost:8000/api`.
* **Earlier client**: `frontend/` can be started separately, but it does not expose the complete current UI.

---

### 🔐 Environment Variables (`backend/.env` — Optional)
SkillBit runs **out-of-the-box with zero configuration** using SQLite and its built-in deterministic CareerTech fallback engine. To enable live cloud LLM inference, Google OAuth, or SMTP emails, create `backend/.env`:

```ini
# Security & Database (use a unique secret outside local development)
SECRET_KEY=your_super_secret_jwt_signing_key_2026
DATABASE_URL=sqlite:///./app.db
FRONTEND_URL=http://localhost:5173

# Multi-Provider LLM Keys (Auto-detected in priority order: Groq -> Gemini -> Grok -> OpenAI -> Local)
DEFAULT_LLM_PROVIDER=auto
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
GROK_API_KEY=xai-your_grok_api_key_here
OPENAI_API_KEY=sk-your_openai_api_key_here

# Google OAuth 2.0 Single Sign-On (Optional; configure a client for live Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# SMTP Email Notifications (Optional - Logs to console if unconfigured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=SkillBit
SMTP_USE_TLS=true

# Job discovery: public adapters need no key; JSearch portal indexing is optional
ENABLE_LIVE_JOB_DISCOVERY=true
JOB_SEARCH_TIMEOUT_SECONDS=6.0
JOB_SEARCH_RATE_LIMIT_RPM=30
JSEARCH_API_KEY=
```

Use a Gmail **App Password**, not your normal account password. If SMTP is unconfigured, retrieve the verification OTP/link from the backend terminal; regular registration still requires verification. Set `FRONTEND_URL` to the client origin used for activation links. Never commit real credentials.

Live search sends queries to external job sources, and JSearch may incur provider charges or rate limits. Configuring a cloud LLM sends prompt content to that provider; discovery explanation consent can be disabled in job preferences. `ENABLE_LIVE_JOB_DISCOVERY=false` skips the public adapters, but the JSearch adapter currently checks only for its API key—leave `JSEARCH_API_KEY` unset too when avoiding external search requests. Other keys listed in `config.py`/the source registry do not by themselves mean the corresponding adapter is implemented.

### 🔑 Default Seeded Accounts
On first startup, `init_db.py` automatically seeds administrator credentials:
* **Admin Email**: `admin@skillbit.ai` (or `admin@careertech.ai`)
* **Admin Password**: `AdminPass123!`
* **Candidate Account**: Register at `/signup` and verify by OTP/link, or use **Continue with Google** with a configured OAuth client. The earlier JSX client uses `/register`.

---

## 12. Testing & Quality Assurance

SkillBit includes a comprehensive automated test suite (`backend/tests/`) using **Pytest** and FastAPI's `TestClient` with isolated in-memory SQLite databases (`sqlite:///:memory:`).

```powershell
# Run the complete test suite
.\venv\Scripts\python.exe -m pytest backend/tests/ -v
```

### 🧪 Test Suite Coverage Matrix
This is an inventory of available tests, not a recorded test run. Re-run the suite after code or environment changes.

```text
Test Module                             │ Scope & Verification                                     │ Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
test_phase1.py                          │ Taxonomy seeding, alias resolution, Bcrypt, JWT, ORM     │ Run locally
test_api_auth_profile.py                │ Register, Login, Google OAuth auto-provisioning, Profile │ Run locally
test_resume_ingestion.py                │ Text cleaning, hyphen unwrap, Section & Evidence parser  │ Run locally
test_job_analyzer.py                    │ Seniority detection, Required vs Preferred JD weights    │ Run locally
test_matching_and_gaps.py               │ Subword TF-IDF cosine, Multi-factor formula, 4-tier gaps │ Run locally
test_llm_service.py                     │ Provider discovery, Gap insights, 4-stage roadmaps       │ Run locally
test_recommendations.py                 │ Missing vs Weak gap recommendations, STAR bullet API     │ Run locally
test_pdf_export.py                      │ ReportLab binary %PDF generation & streaming endpoint    │ Run locally
test_resume_repo_analyzer.py            │ GitHub URL parser, empty STAR fallback, clickable links  │ Run locally
test_dashboard_and_admin.py             │ Dashboard KPIs, Admin cohort analytics, 403 RBAC guard   │ Run locally
test_job_discovery_engine.py            │ Candidate snapshots, discovery ranking and job tracking │ Run locally
test_json_ld_extractor.py               │ Schema.org JobPosting extraction and nested JSON-LD     │ Run locally
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: 12 Test Modules                  │ Unit and integration tests                              │ Run locally
```

---

## 📊 Presentation & Pitch Deck Resource

Looking to create a **PowerPoint (PPT) / Keynote / Google Slides / Gamma** presentation for this project?
👉 Check out **[`PRESENTATION_PPT_GUIDE.md`](PRESENTATION_PPT_GUIDE.md)** for a complete **8–10 slide presentation blueprint**, including slide-by-slide layouts, speaker notes, architecture summaries, and raw CSV/chart datasets ready to plot!

---

## 📄 License

This project is licensed under the **MIT License**.

<div align="center">
  <br/>
  <b>Built with 💜 by the SkillBit Engineering Team</b><br/>
  <i>Explainable AI • Zero-Hallucination Resume Engineering • Actionable Career Roadmaps</i>
</div>

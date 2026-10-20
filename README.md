# SkillBit — AI Resume Builder & Skill Gap Analyzer

> **SkillBit: A Production-Quality CareerTech Web Platform & Academic Prototype**  
> *Bridging candidate resumes and modern ATS requirements through transparent, explainable AI/NLP matching, multi-provider LLMs, and targeted visual learning roadmaps.*

[![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Pytest-36%20Passed%20(100%25)-success.svg)](https://docs.pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Overview & Core Highlights

**SkillBit** is an intelligent, explainable career-tech platform designed to eliminate the ambiguity of modern Applicant Tracking Systems (ATS). Rather than operating as an opaque, hallucination-prone chatbot wrapper, SkillBit couples deterministic NLP heuristics, an alias-normalized taxonomy, and a multi-provider LLM orchestration engine to deliver transparent skill-gap detection, actionable visual learning roadmaps, and verifiable STAR-method resume enhancements.

### Key Capabilities
- **Multi-Provider LLM Orchestration**: Integrated LLM service (`llm_service.py`) supporting **Groq** (Llama 3.3/3.1), **Google Gemini** (Gemini 1.5/2.5), **xAI Grok**, **OpenAI** (GPT-4o), and an offline deterministic mock mode with automatic intelligent fallback.
- **Secure Authentication & RBAC**: JWT bearer tokens, bcrypt password hashing, and role-based access control (RBAC) for candidates, university placement mentors, and administrators.
- **Google OAuth 2.0 Single Sign-On**: Seamless Google Sign-In with automatic user provisioning and secure JWT session bridging.
- **Canonical Skill Taxonomy**: 500+ curated technical and soft skills across 12 categories with 1,500+ aliases and strict boundary preservation (e.g., `Java` is strictly distinct from `JavaScript`; `React.js` canonicalizes to `React`).
- **Layout-Aware Document Ingestion**: PyMuPDF (`fitz`), `python-docx`, and plain-text parsers extracting sections, contact coordinates, hyperlinks, and work experience while stripping non-printable artifacts.
- **Multi-Pass Skill Extractor with Evidence Tracing**: Scans candidate bullets for action verbs and quantified impact to assign evidence confidence tiers (`STRONG`, `MODERATE`, `LISTED`, `MENTIONED`).
- **Job Description Analyzer**: Automatically distinguishes between core `REQUIRED` criteria (weight 1.0) and bonus `PREFERRED` qualifications (weight 0.5), inferring seniority levels (`Lead`, `Senior`, `Mid`, `Entry`).
- **Explainable Hybrid Matching Engine**: Calculates transparent fit scores across exact matches, candidate experience evidence, and dense TF-IDF semantic resonance without arbitrary black-box scoring.
- **Actionable 4-Tier Skill Gap Classification**: Categorizes requirements into `STRONG_MATCH`, `PARTIAL_MATCH`, `WEAK_EVIDENCE`, and `MISSING`, assigning high/medium/low priority and human-readable reasoning.
- **Interactive Visual Roadmap Tree**: Renders dynamic, node-based SVG learning trees (`RoadmapTree.jsx`) detailing step-by-step concepts, milestone projects, and recommended certifications to bridge detected gaps.
- **STAR-Method Bullet Optimizer**: Context-aware bullet improver that guides candidates to strengthen accomplishment statements using the Situation-Task-Action-Result format with human-in-the-loop review.
- **ATS-Compliant Resume Builder & Server-Side PDF Export**: Single-column, machine-readable resume generator with live preview and binary PDF streaming via ReportLab featuring clickable hyperlinks (GitHub, LinkedIn, Portfolios).
- **Email Notification Dispatcher**: Asynchronous SMTP notification service for onboarding welcomes, analysis completion summaries, and career alerts.
- **Placement & University Cohort Analytics**: Administrative dashboard aggregating top cohort-wide skill gaps, average match indices, and candidate readiness distributions.

---

## 2. Technology Stack

- **Backend**: Python 3.12 / 3.14, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, SQLite / PostgreSQL, PyJWT, Passlib (Bcrypt), PyMuPDF, python-docx, Scikit-Learn, ReportLab.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios.
- **LLM Integrations**: Groq Cloud SDK, Google Generative AI SDK, OpenAI API, xAI Grok, with custom fallback router.
- **Testing**: Pytest with 36 automated unit & integration tests covering 100% of pipeline modules.

---

## 3. Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & lifespan
│   │   ├── config.py                # Environment configuration & settings
│   │   ├── api/                     # REST API routers
│   │   │   ├── auth.py              # Login, register, Google OAuth, current user
│   │   │   ├── profile.py           # Education, experience, projects, skills CRUD
│   │   │   ├── skills.py            # Taxonomy search, categories, normalization
│   │   │   ├── resume.py            # Upload, parse, create, export PDF
│   │   │   ├── job.py               # Requirement extraction & JD analyzer
│   │   │   ├── match.py             # Explainable matching & gap detection
│   │   │   ├── recommendation.py    # Learning roadmaps & STAR bullet generator
│   │   │   ├── dashboard.py         # KPIs, quality indicators & history
│   │   │   └── admin.py             # Cohort placement analytics & taxonomy CRUD
│   │   ├── models/                  # SQLAlchemy 2.0 relational models
│   │   ├── schemas/                 # Pydantic v2 request/response schemas
│   │   ├── ai/                      # Core AI / NLP Pipeline
│   │   │   ├── llm_service.py       # Multi-LLM provider router (Groq/Gemini/Grok/OpenAI/Mock)
│   │   │   ├── resume_parser.py     # PDF/DOCX layout-aware text extraction
│   │   │   ├── section_classifier.py# Structural section & contact classifier
│   │   │   ├── skill_extractor.py   # Multi-pass gazetteer & evidence tracer
│   │   │   ├── skill_normalizer.py  # Canonical alias resolution
│   │   │   ├── job_analyzer.py      # Required vs Preferred qualification classifier
│   │   │   ├── embedding_service.py # TF-IDF & subword semantic similarity
│   │   │   ├── matching_engine.py   # Explainable multi-factor scoring formula
│   │   │   ├── gap_analyzer.py      # 4-tier gap classification & priority matrix
│   │   │   ├── recommendation_engine.py # Curated roadmap & certification catalog
│   │   │   └── resume_content_generator.py # Anti-hallucination STAR bullet engine
│   │   ├── database/                # Database engine, session, and seeders
│   │   ├── services/
│   │   │   ├── pdf_service.py       # ATS ReportLab single-column PDF builder
│   │   │   └── email_service.py     # Asynchronous SMTP notification service
│   │   └── utils/
│   │       ├── security.py          # Password hashing & JWT helpers
│   │       ├── file_storage.py      # Secure private file storage
│   │       └── taxonomy_data.py     # 500+ curated canonical skills catalog
│   └── tests/                       # Automated test suite (36 test cases)
├── frontend/
│   ├── public/                      # Static assets & brand logos
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Navbar.jsx           # Global header with authentication controls
│   │   │   ├── Sidebar.jsx          # Responsive navigation sidebar
│   │   │   ├── ProtectedRoute.jsx   # Route guards & RBAC authorization
│   │   │   ├── ScoreGauge.jsx       # SVG radial fit gauge & ATS disclaimer
│   │   │   ├── GapCard.jsx          # Interactive gap drilldown card
│   │   │   ├── RoadmapTree.jsx      # Visual interactive learning roadmap tree
│   │   │   ├── BulletSuggestionModal.jsx # Human-in-the-loop STAR optimizer
│   │   │   └── GoogleSignInButton.jsx    # Google OAuth 2.0 component
│   │   ├── pages/                   # Application views
│   │   │   ├── Login.jsx & Register.jsx # Authentication screens
│   │   │   ├── Dashboard.jsx        # KPIs, completeness, and recent analyses
│   │   │   ├── Profile.jsx          # Master career profile manager
│   │   │   ├── ResumeBuilder.jsx    # Live ATS builder with PDF download
│   │   │   ├── ResumeUpload.jsx     # Document parser & extraction inspector
│   │   │   ├── JobAnalysis.jsx      # Job fit evaluation & gap breakdown
│   │   │   ├── Recommendations.jsx  # Targeted roadmaps & project concepts
│   │   │   └── AdminTaxonomy.jsx    # Placement cohort stats & taxonomy CRUD
│   │   ├── context/AuthContext.jsx  # Global authentication context
│   │   ├── services/api.js          # Axios client with interceptors
│   │   └── index.css                # Glassmorphic Tailwind CSS design system
└── start.bat                        # One-click Windows development startup script
```

---

## 4. Setup & Running Locally

### Prerequisites
- Python 3.12+ (Python 3.14 fully supported)
- Node.js 18+ and npm
- Git

### One-Click Quickstart (Windows)
Double-click `start.bat` or run:
```cmd
start.bat
```
This script automatically activates the Python virtual environment, boots the FastAPI server on port 8000, and launches the Vite React frontend on port 5173.

### Manual Setup

#### 1. Backend API Server
```powershell
# Create/activate virtualenv
python -m venv venv
.\venv\Scripts\activate

# Install dependencies & run backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Swagger UI) is available at: `http://localhost:8000/docs`

#### 2. React Frontend Server
```powershell
cd frontend
npm install
npm run dev
```
Access the application at: `http://localhost:5173`

---

## 5. Running the Automated Test Suite

To run all 36 automated test cases across auth, profile, parser, NLP, LLM, PDF export, and match modules:
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests/ -v
```

---

## 6. Demo Script (End-to-End Walkthrough)

1. **Authentication**: Sign in using `admin@skillbit.ai` / `AdminPass123!` (or sign in via Google OAuth) or register a new candidate account.
2. **Profile & Resume Builder**: Navigate to `/builder` to inspect the ATS layout, use the AI STAR bullet improver to strengthen accomplishment phrasing, and click **Export ATS PDF**.
3. **Resume Ingestion**: Navigate to `/upload` and upload a PDF, DOCX, or text resume to observe real-time section classification and skill evidence extraction.
4. **Job Fit Analysis**: Navigate to `/match`, select your resume, paste a target Job Description, and click **Run Match & Skill Gap Analysis**.
5. **Skill Gaps & Gauge**: Inspect the transparent fit score gauge, examine which required skills were found vs missing, and review the human-readable explanation and evidence snippet for each gap.
6. **Visual Roadmap Tree**: Navigate to `/recommendations` to explore interactive SVG learning roadmap trees tailored to detected skill gaps.
7. **Placement Insights**: Visit `/admin` to review batch candidate readiness statistics, average fit scores, and top missing skills across the graduating cohort.

---

## 7. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

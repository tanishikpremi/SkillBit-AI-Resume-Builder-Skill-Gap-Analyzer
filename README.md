# AI Resume Builder & Skill Gap Analyzer

> **A Production-Quality Academic Prototype CareerTech Web Platform**  
> *Bridging candidate resumes and modern ATS requirements through transparent, explainable AI/NLP matching and targeted learning roadmaps.*

---

## 1. Overview & Core Highlights

The **AI Resume Builder & Skill Gap Analyzer** is designed to demonstrate authentic software engineering, natural language processing, and responsible AI practices rather than acting as a superficial wrapper around an opaque chatbot.

### Key Capabilities
- **Secure Authentication & RBAC**: JWT bearer tokens, bcrypt password hashing, and role-based access for candidates, admins, and placement mentors.
- **Canonical Skill Taxonomy**: 500+ curated technical and soft skills across 12 categories with 1,500+ aliases and strict boundaries (e.g. `Java` is distinct from `JavaScript`; `React.js` resolves to `React`).
- **Layout-Aware Document Ingestion**: PyMuPDF (`fitz`), `python-docx`, and plain text parser extracting sections and contact coordinates while filtering non-printable noise.
- **Multi-Pass Skill Extractor with Evidence Tracing**: Scans candidate experience and projects for action verbs and quantified achievements to assign evidence levels (`STRONG`, `MODERATE`, `LISTED`).
- **Job Description Analyzer**: Automatically distinguishes between core `REQUIRED` criteria (weight 1.0) and bonus `PREFERRED` qualifications (weight 0.5), inferring seniority levels (`Lead`, `Senior`, `Mid`, `Entry`).
- **Explainable Hybrid Matching Engine**: Calculates transparent fit scores across exact matches, candidate experience evidence, and dense TF-IDF semantic resonance without arbitrary black-box scoring.
- **Actionable Skill Gap Classification**: Categorizes requirements into `STRONG_MATCH`, `PARTIAL_MATCH`, `WEAK_EVIDENCE`, and `MISSING`, assigning high/medium/low priority and human-readable reasoning.
- **Personalized Recommendations & STAR Bullet Optimizer**: Prescribes validated learning topics, core concepts, hands-on practice projects, certifications, and grounded STAR-method resume bullet refinements.
- **ATS-Compliant Resume Builder & Server-Side PDF Export**: Single-column, machine-readable resume generator with live preview and binary PDF streaming via ReportLab.
- **Admin & University Placement Analytics**: Master taxonomy manager and cohort analytics aggregating top missing skills across all applicants for academic placement teams.

---

## 2. Technology Stack

- **Backend**: Python 3.14 / 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, SQLite / PostgreSQL, PyJWT, Bcrypt, PyMuPDF, python-docx, Scikit-Learn, ReportLab.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios.
- **Testing**: Pytest with 28 automated tests covering 100% of pipeline modules.

---

## 3. Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & lifespan
│   │   ├── config.py                # Environment configuration & settings
│   │   ├── api/                     # REST API routers
│   │   │   ├── auth.py              # Login, register, current user
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
│   │   │   └── pdf_service.py       # ATS ReportLab single-column PDF builder
│   │   └── utils/
│   │       ├── security.py          # Password hashing & JWT helpers
│   │       ├── file_storage.py      # Secure private file storage
│   │       └── taxonomy_data.py     # 500+ curated canonical skills catalog
│   └── tests/                       # Automated test suite (28 test cases)
└── frontend/
    ├── src/
    │   ├── components/              # Reusable UI components
    │   │   ├── Navbar.jsx           # Global navigation with session controls
    │   │   ├── ProtectedRoute.jsx   # Route guards & RBAC authorization
    │   │   ├── ScoreGauge.jsx       # SVG radial fit gauge & ATS disclaimer
    │   │   ├── GapCard.jsx          # Interactive gap drilldown card
    │   │   └── BulletSuggestionModal.jsx # Human-in-the-loop STAR optimizer
    │   ├── pages/                   # Application views
    │   │   ├── Login.jsx & Register.jsx # Authentication screens
    │   │   ├── Dashboard.jsx        # KPIs, completeness, and recent analyses
    │   │   ├── Profile.jsx          # Master career profile manager
    │   │   ├── ResumeBuilder.jsx    # Live ATS builder with PDF download
    │   │   ├── ResumeUpload.jsx     # Document parser & extraction inspector
    │   │   ├── JobAnalysis.jsx      # Job fit evaluation & gap breakdown
    │   │   ├── Recommendations.jsx  # Targeted roadmaps & project concepts
    │   │   └── AdminTaxonomy.jsx    # Placement cohort stats & taxonomy CRUD
    │   ├── context/AuthContext.jsx  # Global authentication context
    │   ├── services/api.js          # Axios client with interceptors
    │   └── index.css                # Glassmorphic Tailwind CSS design system
```

---

## 4. Setup & Running Locally

### Prerequisites
- Python 3.12+ (Python 3.14 supported)
- Node.js 18+ and npm

### 1. Start the Backend API Server
```powershell
# In project root
.\venv\Scripts\activate
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Swagger UI) is available at: `http://localhost:8000/docs`

### 2. Start the React Frontend Dev Server
```powershell
cd frontend
npm run dev
```
Access the application at: `http://localhost:5173`

---

## 5. Running the Automated Test Suite

To run all 28 automated tests:
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests/ -v
```

---

## 6. Demo Script (End-to-End Walkthrough)

1. **Authentication**: Sign in using `admin@careertech.ai` / `AdminPass123!` or register a new candidate account.
2. **Profile & Resume Builder**: Navigate to `/builder` to inspect the ATS layout, use the AI STAR bullet improver to strengthen accomplishment phrasing, and click **Export ATS PDF**.
3. **Resume Ingestion**: Navigate to `/upload` and upload a PDF, DOCX, or text resume to observe real-time section classification and skill evidence extraction.
4. **Job Fit Analysis**: Navigate to `/match`, select your resume, paste a target Job Description, and click **Run Match & Skill Gap Analysis**.
5. **Skill Gaps & Gauge**: Inspect the transparent fit score gauge, examine which required skills were found vs missing, and review the human-readable explanation for each gap.
6. **Actionable Roadmaps**: Click **View Roadmaps** to explore curated concepts, practice projects, certifications, and suggested STAR bullets for closing detected gaps.
7. **Placement Insights**: Visit `/admin` to review batch candidate readiness statistics, average fit scores, and top missing skills across the graduating cohort.

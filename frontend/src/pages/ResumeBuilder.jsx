import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BulletSuggestionModal from '../components/BulletSuggestionModal';
import { 
  FileText, 
  Download, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  FolderGit2,
  Upload,
  User,
  Code2,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Award,
  Globe,
  Layers,
  LayoutTemplate,
  Bold,
  Italic,
  Underline,
  Palette,
  Type,
  Table as TableIcon,
  Wand2,
  CheckCircle2,
  X
} from 'lucide-react';

// Automatic skill classifier dictionary for organizing flat skills into structured ATS categories
const SKILL_CATEGORY_MAP = {
  'Programming Languages': [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'golang', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 'css', 'bash', 'shell', 'r', 'scala', 'dart'
  ],
  'Frameworks & Libraries': [
    'react', 'next.js', 'nextjs', 'vue.js', 'vue', 'angular', 'fastapi', 'django', 'flask',
    'express.js', 'express', 'nestjs', 'spring boot', 'asp.net core', 'ruby on rails',
    'flutter', 'react native', 'svelte', 'redux', 'tailwind css', 'bootstrap', 'pandas',
    'numpy', 'scikit-learn', 'pytorch', 'tensorflow', 'keras', 'opencv', 'sqlalchemy', 'axios', 'node.js'
  ],
  'Databases & Storage': [
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'cassandra',
    'amazon dynamodb', 'dynamodb', 'microsoft sql server', 'oracle database', 'elasticsearch', 'snowflake'
  ],
  'Cloud & DevOps': [
    'aws', 'microsoft azure', 'azure', 'google cloud platform', 'gcp', 'docker',
    'kubernetes', 'k8s', 'ci/cd', 'github actions', 'jenkins', 'terraform', 'ansible', 'linux', 'nginx'
  ],
  'AI, Data & Developer Tools': [
    'machine learning', 'deep learning', 'natural language processing', 'nlp', 'computer vision',
    'large language models', 'llms', 'generative ai', 'retrieval-augmented generation', 'rag',
    'prompt engineering', 'langchain', 'data analysis', 'etl', 'apache spark', 'apache kafka', 'kafka',
    'tableau', 'power bi', 'git', 'github', 'postman', 'jira', 'figma', 'restful apis', 'graphql',
    'microservices', 'system design', 'object-oriented programming', 'test-driven development'
  ],
  'Soft Skills & Methodologies': [
    'problem solving', 'team collaboration', 'communication', 'leadership', 'time management',
    'critical thinking', 'agile methodology', 'agile', 'scrum'
  ]
};

const DEFAULT_SKILL_CATEGORIES = [
  { category: 'Programming Languages', skills: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
  { category: 'Frameworks & Libraries', skills: ['FastAPI', 'React', 'Next.js', 'Tailwind CSS'] },
  { category: 'Databases & Storage', skills: ['PostgreSQL', 'Redis', 'MongoDB'] },
  { category: 'Cloud & DevOps', skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'GitHub Actions'] },
  { category: 'AI, Data & Developer Tools', skills: ['RESTful APIs', 'Microservices', 'System Design', 'Git'] },
];

const SUMMARY_TEMPLATES = [
  {
    label: 'Full-Stack & Cloud',
    text: 'Results-driven **Full-Stack & Cloud Software Engineer** with proven expertise in architecting high-throughput **Python/FastAPI** microservices, modern **React/TypeScript** interfaces, and containerized **AWS/Docker** infrastructure. Adept at optimizing database latency, automating CI/CD pipelines, and delivering resilient production systems.'
  },
  {
    label: 'AI & ML Engineer',
    text: '**AI & Machine Learning Engineer** specializing in **Large Language Models (LLMs)**, **Retrieval-Augmented Generation (RAG)**, and scalable NLP pipelines. Experienced in bridging research models with low-latency FastAPI inference services and production cloud deployments.'
  },
  {
    label: 'Backend & Distributed Systems',
    text: '**Backend Software Engineer** focused on distributed systems, event-driven architectures, and relational database optimization. Proven track record of scaling RESTful/GraphQL APIs, reducing query execution times by **35%**, and maintaining **99.9%+** service reliability.'
  },
  {
    label: 'Software Graduate / Entry-Level',
    text: 'Detail-oriented **Computer Science graduate** with strong foundations in data structures, object-oriented design, and full-stack web development. Demonstrated ability to build and deploy end-to-end cloud applications using **Python, React, PostgreSQL, and Docker**.'
  }
];

const DESIGNATION_PRESETS = [
  'Senior Full-Stack Software Engineer',
  'Backend & Cloud Systems Architect',
  'AI / Machine Learning Engineer',
  'Software Development Engineer (SDE)',
  'Data & Analytics Engineer',
  'DevOps & Site Reliability Engineer'
];

const COLOR_PRESETS = [
  { name: 'Executive Navy', hex: '#1E3A8A' },
  { name: 'SkillBit Purple', hex: '#6D28D9' },
  { name: 'Obsidian Black', hex: '#111827' },
  { name: 'Emerald Teal', hex: '#0F766E' },
  { name: 'Academic Crimson', hex: '#9F1239' },
  { name: 'Cobalt Blue', hex: '#0284C7' },
];

// Renders inline **bold**, *italic*, and __underline__ / <u>underline</u> safely in React JSX
function renderRichText(text) {
  if (!text) return null;
  const str = String(text);
  const parts = str.split(/(\*\*.*?\*\*|__.*?__|<u>.*?<\/u>|\*[^*]+?\*)/gi);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
      return <u key={idx} className="underline">{part.slice(2, -2)}</u>;
    }
    if (part.toLowerCase().startsWith('<u>') && part.toLowerCase().endsWith('</u>')) {
      return <u key={idx} className="underline">{part.slice(3, -4)}</u>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={idx} className="italic">{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export default function ResumeBuilder() {
  const [resumes, setResumes] = useState([]);
  const [activeResumeId, setActiveResumeId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [atsTemplate, setAtsTemplate] = useState('executive'); // 'executive' | 'modern' | 'academic'

  // Typography, Color & Styling State
  const [fontFamily, setFontFamily] = useState('sans'); // 'sans' | 'serif' | 'mono' | 'calibri'
  const [fontSize, setFontSize] = useState('standard'); // 'compact' | 'standard' | 'comfortable'
  const [lineSpacing, setLineSpacing] = useState('normal'); // 'tight' | 'normal' | 'relaxed'
  const [accentColor, setAccentColor] = useState('#1E3A8A');
  const [skillsDisplayMode, setSkillsDisplayMode] = useState('rows'); // 'rows' | 'table'

  // LLM Auto-Format & Messy Layout Fixer State
  const [autoFormatting, setAutoFormatting] = useState(false);
  const [fixesBanner, setFixesBanner] = useState([]);
  const [showMessyPasteModal, setShowMessyPasteModal] = useState(false);
  const [messyRawText, setMessyRawText] = useState('');

  // Document & Header State
  const [title, setTitle] = useState('Senior Full-Stack Engineer Resume');
  const [fullName, setFullName] = useState('Alex Mercer');
  const [designation, setDesignation] = useState('Senior Full-Stack Software Engineer | Cloud & AI Systems');
  const [email, setEmail] = useState('alex.mercer@example.com');
  const [phone, setPhone] = useState('(555) 234-5678');
  const [location, setLocation] = useState('San Francisco, CA');
  const [linkedin, setLinkedin] = useState('https://linkedin.com/in/alexmercer');
  const [github, setGithub] = useState('https://github.com/alexmercer');
  const [portfolio, setPortfolio] = useState('');
  const [customLinks, setCustomLinks] = useState([]);

  // Summary State
  const [summary, setSummary] = useState(SUMMARY_TEMPLATES[0].text);

  // Categorized Skills State
  const [skillCategories, setSkillCategories] = useState(DEFAULT_SKILL_CATEGORIES);
  const [selectedCatIdx, setSelectedCatIdx] = useState(0);
  const [skillInput, setSkillInput] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Work Experience State
  const [experiences, setExperiences] = useState([
    {
      company: 'CloudScale AI',
      role_title: 'Senior Software Engineer',
      employment_type: 'Full-Time',
      location: 'San Francisco, CA',
      start_date: 'Jan 2022',
      end_date: 'Present',
      is_current: true,
      bullets: [
        'Architected and deployed asynchronous microservices using **FastAPI** and **Docker**, handling **40k req/min** with **99.9% uptime**.',
        'Optimized **PostgreSQL** query execution plans and Redis caching, reducing average endpoint latency by **35%**.'
      ]
    }
  ]);

  // Projects State
  const [projects, setProjects] = useState([
    {
      title: 'Real-Time Event Streaming Engine',
      technologies: ['Python', 'Kafka', 'Redis', 'Docker'],
      date: '2024',
      repo_url: 'https://github.com/example/stream-engine',
      live_url: '',
      bullets: [
        'Engineered distributed pub/sub messaging engine processing **100k events/sec** with fault tolerance and automatic backpressure.',
        'Implemented **Redis** caching layer and Prometheus health telemetry, decreasing downstream processing overhead by **40%**.'
      ]
    }
  ]);

  // Education State
  const [educations, setEducations] = useState([
    {
      degree: 'B.S.',
      field_of_study: 'Computer Science & Engineering',
      institution: 'University of California, Berkeley',
      location: 'Berkeley, CA',
      start_date: '2018',
      end_date: '2022',
      gpa: '3.85 / 4.0',
      honors: "Dean's Honor List • Distributed Systems, Algorithms, Database Internals, Machine Learning"
    }
  ]);

  // Custom Multi-Column Tables State
  const [customTables, setCustomTables] = useState([]);

  // Certifications & Achievements State
  const [certifications, setCertifications] = useState([
    {
      name: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      date: '2024',
      url: ''
    }
  ]);

  // Spoken Languages State
  const [languages, setLanguages] = useState([
    { language: 'English', proficiency: 'Full Professional' },
    { language: 'Hindi', proficiency: 'Native / Bilingual' }
  ]);

  // GitHub Repo AI Analyzer State
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  const [repoAnalysisError, setRepoAnalysisError] = useState('');

  // STAR Bullet Suggestion modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetBulletTarget, setTargetBulletTarget] = useState({ type: 'exp', index: 0, bulletIndex: 0 });
  const [modalData, setModalData] = useState({ original: '', suggested: '', changes: '' });
  const [suggesting, setSuggesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Wrap selected text or entire text in **bold**, *italic*, or __underline__
  const applyInlineFormatting = (currentValue, onChangeFn, formatType, inputElementId) => {
    const marker = formatType === 'bold' ? '**' : formatType === 'italic' ? '*' : '__';
    const el = inputElementId ? document.getElementById(inputElementId) : null;

    if (el && typeof el.selectionStart === 'number' && el.selectionStart !== el.selectionEnd) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = currentValue.slice(start, end);
      const updated = currentValue.slice(0, start) + `${marker}${selected}${marker}` + currentValue.slice(end);
      onChangeFn(updated);
      return;
    }

    // If no text is highlighted, toggle or wrap key metrics / phrase
    if (currentValue && currentValue.trim()) {
      onChangeFn(`${marker}${currentValue.trim()}${marker}`);
    } else {
      onChangeFn(`${marker}text${marker}`);
    }
  };

  // Compute flat skills list from categorized skills for backward compatibility
  const getFlatSkills = (categories = skillCategories) => {
    const all = [];
    categories.forEach(cat => {
      (cat.skills || []).forEach(s => {
        if (s && !all.includes(s)) all.push(s);
      });
    });
    return all;
  };

  // Auto-categorize a flat array of skill names into structured ATS categories
  const categorizeFlatSkills = (flatSkillsList) => {
    if (!flatSkillsList || flatSkillsList.length === 0) return DEFAULT_SKILL_CATEGORIES;
    const buckets = {
      'Programming Languages': [],
      'Frameworks & Libraries': [],
      'Databases & Storage': [],
      'Cloud & DevOps': [],
      'AI, Data & Developer Tools': [],
      'Soft Skills & Methodologies': [],
      'Other Technical Skills': []
    };

    flatSkillsList.forEach(rawSkill => {
      const sName = (typeof rawSkill === 'object' ? (rawSkill.canonical_name || rawSkill.name) : String(rawSkill || '')).trim();
      if (!sName) return;
      const lower = sName.toLowerCase();
      let matchedCat = null;
      for (const [catName, keywords] of Object.entries(SKILL_CATEGORY_MAP)) {
        if (keywords.includes(lower)) {
          matchedCat = catName;
          break;
        }
      }
      const targetBucket = matchedCat || 'Other Technical Skills';
      if (!buckets[targetBucket].includes(sName)) {
        buckets[targetBucket].push(sName);
      }
    });

    const resultCats = Object.entries(buckets)
      .filter(([, arr]) => arr.length > 0)
      .map(([category, skills]) => ({ category, skills }));

    return resultCats.length > 0 ? resultCats : DEFAULT_SKILL_CATEGORIES;
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resume');
      setResumes(res.data);
      if (res.data.length > 0 && !activeResumeId) {
        loadResumeData(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch resumes:", err);
    }
  };

  const applyStructuredDataToState = (data) => {
    if (!data) return;
    const contact = data.contact_info || {};

    if (data.full_name || contact.full_name) setFullName(data.full_name || contact.full_name);
    if (data.designation || data.headline || contact.designation || contact.headline) {
      setDesignation(data.designation || data.headline || contact.designation || contact.headline);
    }
    if (contact.email !== undefined) setEmail(contact.email || '');
    if (contact.phone !== undefined) setPhone(contact.phone || '');
    if (contact.location !== undefined) setLocation(contact.location || '');
    if (contact.linkedin !== undefined) setLinkedin(contact.linkedin || '');
    if (contact.github !== undefined) setGithub(contact.github || '');
    if (contact.portfolio !== undefined || data.portfolio !== undefined) {
      setPortfolio(contact.portfolio || data.portfolio || '');
    }
    if (data.custom_links || contact.custom_links) {
      setCustomLinks(data.custom_links || contact.custom_links || []);
    }
    if (data.summary !== undefined) setSummary(data.summary || '');

    if (data.skill_categories && Array.isArray(data.skill_categories) && data.skill_categories.length > 0) {
      setSkillCategories(data.skill_categories);
    } else if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      setSkillCategories(categorizeFlatSkills(data.skills));
    } else if (data.extracted_skills && Array.isArray(data.extracted_skills) && data.extracted_skills.length > 0) {
      setSkillCategories(categorizeFlatSkills(data.extracted_skills));
    }

    if (data.experiences && data.experiences.length > 0) setExperiences(data.experiences);
    if (data.educations && data.educations.length > 0) setEducations(data.educations);
    if (data.projects && data.projects.length > 0) {
      const normalizedProjects = data.projects.map(p => ({
        title: p.title || 'Project',
        technologies: p.technologies || [],
        date: p.date || '',
        repo_url: p.repo_url || '',
        live_url: p.live_url || '',
        bullets: p.bullets || (p.description ? [p.description] : [''])
      }));
      setProjects(normalizedProjects);
    }
    if (data.custom_tables && Array.isArray(data.custom_tables)) {
      setCustomTables(data.custom_tables);
    }
    if (data.certifications && Array.isArray(data.certifications)) {
      setCertifications(data.certifications);
    }
    if (data.languages && Array.isArray(data.languages)) {
      setLanguages(data.languages);
    }
    if (data.style_settings) {
      const st = data.style_settings;
      if (st.font_family) setFontFamily(st.font_family);
      if (st.font_size) setFontSize(st.font_size);
      if (st.line_spacing) setLineSpacing(st.line_spacing);
      if (st.accent_color) setAccentColor(st.accent_color);
      if (st.skills_display_mode) setSkillsDisplayMode(st.skills_display_mode);
    }
  };

  const loadResumeData = (resObj) => {
    if (!resObj) return;
    setActiveResumeId(resObj.id);
    setTitle(resObj.title || 'My Professional Resume');
    applyStructuredDataToState(resObj.structured_json || {});
  };

  const buildCurrentStructuredJson = () => {
    const flatSkills = getFlatSkills();
    const extractedSkillsPayload = flatSkills.map(sName => ({
      skill_id: sName.toLowerCase(),
      canonical_name: sName,
      category: 'Technical',
      evidence_level: 'STRONG',
      evidence_snippets: [`Applied ${sName} in engineering projects and work experience.`]
    }));

    return {
      title,
      full_name: fullName,
      designation,
      headline: designation,
      contact_info: {
        full_name: fullName,
        designation,
        headline: designation,
        email,
        phone,
        location,
        linkedin,
        github,
        portfolio,
        custom_links: customLinks
      },
      custom_links: customLinks,
      summary,
      skill_categories: skillCategories,
      skills_display_mode: skillsDisplayMode,
      skills: flatSkills,
      extracted_skills: extractedSkillsPayload,
      experiences,
      educations,
      projects,
      custom_tables: customTables,
      certifications,
      languages,
      style_settings: {
        font_family: fontFamily,
        font_size: fontSize,
        line_spacing: lineSpacing,
        accent_color: accentColor,
        skills_display_mode: skillsDisplayMode,
        template: atsTemplate
      }
    };
  };

  // LLM Auto-Fix Formatting & Messy Layout Handler
  const handleRunLLMAutoFormat = async (rawTextOverride = null) => {
    setAutoFormatting(true);
    setFixesBanner([]);
    try {
      const currentJson = buildCurrentStructuredJson();
      const res = await api.post('/resume/auto-format', {
        structured_json: currentJson,
        raw_messy_text: rawTextOverride || null,
        target_role: designation || 'Software Engineer'
      });

      if (res.data?.structured_json) {
        applyStructuredDataToState(res.data.structured_json);
      }
      if (res.data?.fixes_applied?.length > 0) {
        setFixesBanner(res.data.fixes_applied);
      }
      setShowMessyPasteModal(false);
      setMessyRawText('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to auto-format resume.');
    } finally {
      setAutoFormatting(false);
    }
  };

  const handleAutoFillFromResume = async () => {
    try {
      const res = await api.get('/resume');
      if (res.data && res.data.length > 0) {
        loadResumeData(res.data[0]);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("No uploaded resume found. Upload a resume first in 'Upload Resume'.");
      }
    } catch {
      alert("Failed to load resume data.");
    }
  };

  const handleImportFromMasterProfile = async () => {
    try {
      const res = await api.get('/profile');
      const p = res.data;
      if (p) {
        if (p.headline) {
          setDesignation(p.headline);
          setTitle(`${fullName || 'Candidate'} — ${p.headline}`);
        }
        if (p.summary) setSummary(p.summary);
        if (p.phone) setPhone(p.phone);
        if (p.location) setLocation(p.location);
        if (p.linkedin_url) setLinkedin(p.linkedin_url);
        if (p.github_url) setGithub(p.github_url);
        if (p.portfolio_url) setPortfolio(p.portfolio_url);
        if (p.user_skills && p.user_skills.length > 0) {
          const skillNames = p.user_skills.map(s => s.skill_name);
          setSkillCategories(categorizeFlatSkills(skillNames));
        }
        if (p.experiences && p.experiences.length > 0) {
          setExperiences(p.experiences);
        }
        if (p.educations && p.educations.length > 0) {
          setEducations(p.educations);
        }
        if (p.projects && p.projects.length > 0) {
          const normProjects = p.projects.map(proj => ({
            title: proj.title,
            technologies: proj.technologies || [],
            date: '',
            repo_url: proj.repo_url || '',
            live_url: proj.live_url || '',
            bullets: proj.bullets || (proj.description ? [proj.description] : [''])
          }));
          setProjects(normProjects);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      alert("Failed to load Candidate Profile.");
    }
  };

  const handleAddSkillToCategory = () => {
    const clean = skillInput.trim();
    if (!clean) return;
    const updated = [...skillCategories];
    const targetIdx = selectedCatIdx < updated.length ? selectedCatIdx : 0;
    if (!updated[targetIdx]) {
      updated.push({ category: 'Technical Skills', skills: [clean] });
    } else if (!updated[targetIdx].skills.includes(clean)) {
      updated[targetIdx].skills = [...updated[targetIdx].skills, clean];
    }
    setSkillCategories(updated);
    setSkillInput('');
  };

  const handleRemoveSkillFromCategory = (catIdx, skillIdx) => {
    const updated = [...skillCategories];
    updated[catIdx].skills = updated[catIdx].skills.filter((_, i) => i !== skillIdx);
    setSkillCategories(updated);
  };

  const handleAddCategory = () => {
    const clean = newCategoryName.trim();
    if (!clean) return;
    setSkillCategories([...skillCategories, { category: clean, skills: [] }]);
    setSelectedCatIdx(skillCategories.length);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (catIdx) => {
    const updated = skillCategories.filter((_, i) => i !== catIdx);
    setSkillCategories(updated);
    if (selectedCatIdx >= updated.length) {
      setSelectedCatIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleReorganizeSkillsAutomatically = () => {
    const flat = getFlatSkills();
    setSkillCategories(categorizeFlatSkills(flat));
  };

  // Custom Table Handlers
  const handleAddCustomTable = () => {
    setCustomTables([
      ...customTables,
      {
        title: 'Key Engineering Impact & Benchmarks',
        headers: ['System / Domain', 'Architecture & Stack', 'Quantified Impact'],
        rows: [
          ['API Gateway', 'FastAPI + Redis + Docker', 'Reduced p99 latency by **38%** at **50k RPS**'],
          ['Event Pipeline', 'Python + Apache Kafka', '99.99% delivery reliability across **12 microservices**']
        ]
      }
    ]);
  };

  const handleAnalyzeRepo = async (e) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) {
      setRepoAnalysisError('Please enter a GitHub repository URL.');
      return;
    }
    setAnalyzingRepo(true);
    setRepoAnalysisError('');
    try {
      const res = await api.post('/resume/analyze-repo', {
        repo_url: repoUrlInput.trim()
      });
      const newProj = {
        title: res.data.title,
        repo_url: res.data.repo_url,
        live_url: '',
        date: '2025',
        technologies: res.data.technologies || [],
        bullets: res.data.bullets && res.data.bullets.length > 0 
          ? res.data.bullets 
          : [res.data.description || 'Architected and deployed full-stack open source software solution.']
      };
      setProjects([newProj, ...projects]);
      setRepoUrlInput('');
    } catch (err) {
      setRepoAnalysisError(err.response?.data?.detail || 'Failed to analyze GitHub repository. Please verify the URL.');
    } finally {
      setAnalyzingRepo(false);
    }
  };

  const handleSaveResume = async () => {
    const payload = {
      title,
      structured_json: buildCurrentStructuredJson()
    };

    try {
      let savedId = activeResumeId;
      if (activeResumeId) {
        await api.put(`/resume/${activeResumeId}`, payload);
      } else {
        const res = await api.post('/resume/create', payload);
        savedId = res.data.id;
        setActiveResumeId(savedId);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchResumes();
      return savedId;
    } catch {
      alert("Failed to save resume.");
      return null;
    }
  };

  const handleExportPDF = async () => {
    const targetId = await handleSaveResume();
    const exportId = targetId || activeResumeId;
    if (!exportId) return;
    try {
      const response = await api.get(`/resume/${exportId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_ATS.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      alert("Error generating PDF. Please ensure resume is saved first.");
    }
  };

  const handleTriggerStarAI = async (type, index, bulletIndex, bulletText) => {
    setSuggesting(true);
    setTargetBulletTarget({ type, index, bulletIndex });
    
    const contextRole = type === 'exp' 
      ? (experiences[index]?.role_title || designation || 'Software Engineer')
      : (projects[index]?.title || 'Software Project');

    const flatSkills = getFlatSkills();
    const targetSkill = flatSkills[0] || (projects[index]?.technologies?.[0] || 'Python');

    try {
      const res = await api.post('/resume/suggest-bullets', {
        raw_bullet: bulletText || '',
        target_skill: targetSkill,
        role_context: contextRole
      });
      setModalData({
        original: res.data.original_bullet || bulletText,
        suggested: res.data.suggested_bullet,
        changes: res.data.changes_explained
      });
      setModalOpen(true);
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not generate STAR suggestion.";
      alert(msg);
    } finally {
      setSuggesting(false);
    }
  };

  const handleApplyStarBullet = (improvedText) => {
    if (targetBulletTarget.type === 'exp') {
      const updated = [...experiences];
      updated[targetBulletTarget.index].bullets[targetBulletTarget.bulletIndex] = improvedText;
      setExperiences(updated);
    } else if (targetBulletTarget.type === 'proj') {
      const updated = [...projects];
      if (!updated[targetBulletTarget.index].bullets) {
        updated[targetBulletTarget.index].bullets = [];
      }
      updated[targetBulletTarget.index].bullets[targetBulletTarget.bulletIndex] = improvedText;
      setProjects(updated);
    }
  };

  const formatUrl = (url) => {
    if (!url) return '#';
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const showSection = (secKey) => activeTab === 'all' || activeTab === secKey;

  // Dynamic font family, size & spacing classes for the live paper preview
  const previewFontClass =
    fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'mono'
        ? 'font-mono'
        : 'font-sans';

  const previewTextSizeClass =
    fontSize === 'compact'
      ? 'text-[10.5px]'
      : fontSize === 'comfortable'
        ? 'text-[12.5px]'
        : 'text-[11.5px]';

  const previewLeadingClass =
    lineSpacing === 'tight'
      ? 'leading-tight'
      : lineSpacing === 'relaxed'
        ? 'leading-relaxed'
        : 'leading-snug';

  return (
    <div className="space-y-5 animate-fadeIn pb-16">
      {/* Top Header & Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            AI-Assisted ATS Resume Studio
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-[#1E1B2E] flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Professional ATS Resume Builder
          </h1>
          <p className="text-xs text-[#706886] mt-0.5">
            Custom fonts, rich text styling (bold/italic/underline), custom tables, theme colors, and LLM auto-layout fixer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-lime-700 bg-lime-50 border border-lime-200 px-3 py-1.5 rounded-full flex items-center gap-1 font-semibold animate-pulse">
              <Check className="w-4 h-4" /> Saved!
            </span>
          )}

          {/* LLM Auto-Fix Formatting & Layout Button */}
          <button
            type="button"
            disabled={autoFormatting}
            onClick={() => handleRunLLMAutoFormat(null)}
            title="Uses AI to standardize dates, fix casing, categorize skills, bold key metrics, and optimize ATS spacing"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
          >
            {autoFormatting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            <span>{autoFormatting ? 'AI Formatting...' : 'AI Auto-Fix Formatting'}</span>
          </button>

          {/* Paste Messy Resume Text Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowMessyPasteModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Fix Messy Text
          </button>

          <button
            type="button"
            onClick={handleAutoFillFromResume}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 text-[#2E2842] border border-[#ECE5F6] text-xs font-semibold transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            From Upload
          </button>
          <button
            type="button"
            onClick={handleImportFromMasterProfile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 text-[#2E2842] border border-[#ECE5F6] text-xs font-semibold transition-colors"
          >
            <User className="w-3.5 h-3.5 text-purple-600" />
            From Profile
          </button>
          <button
            onClick={handleSaveResume}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 text-[#2E2842] border border-[#ECE5F6] text-xs font-semibold transition-colors"
          >
            <Save className="w-4 h-4 text-purple-600" />
            Save
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Export ATS PDF
          </button>
        </div>
      </div>

      {/* AI Auto-Format Fixes Applied Notification Banner */}
      {fixesBanner.length > 0 && (
        <div className="bg-lime-50 p-4 sm:p-5 rounded-3xl border border-lime-300 shadow-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-lime-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-600" />
              AI Auto-Formatting & Layout Adjustments Applied ({fixesBanner.length})
            </span>
            <button
              type="button"
              onClick={() => setFixesBanner([])}
              className="text-lime-800 hover:text-lime-950 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-lime-900 pl-1">
            {fixesBanner.map((fix, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-lime-600 font-bold">✓</span>
                <span>{fix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Typography, Styling, Fonts, Colors & Table Mode Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm flex flex-wrap items-center justify-between gap-4">
        {/* Font Family */}
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-purple-600 shrink-0" />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#706886]">Font Family</label>
            <select
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              className="mt-0.5 px-2.5 py-1.5 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E] focus:outline-none focus:border-purple-500"
            >
              <option value="sans">Inter / Helvetica (Sans-Serif)</option>
              <option value="serif">Times / Georgia (Executive Serif)</option>
              <option value="mono">JetBrains / Courier (Technical Mono)</option>
              <option value="calibri">Calibri / Arial (Corporate Sans)</option>
            </select>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#706886]">Font Size</label>
          <div className="flex items-center gap-1 mt-0.5">
            {[
              { id: 'compact', label: 'Compact (10pt)' },
              { id: 'standard', label: 'Standard (11pt)' },
              { id: 'comfortable', label: 'Large (12pt)' },
            ].map(sz => (
              <button
                key={sz.id}
                type="button"
                onClick={() => setFontSize(sz.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                  fontSize === sz.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#FAF8FD] text-[#524B68] border border-[#ECE5F6] hover:bg-purple-50'
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Spacing */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#706886]">Line Spacing</label>
          <div className="flex items-center gap-1 mt-0.5">
            {[
              { id: 'tight', label: 'Tight' },
              { id: 'normal', label: 'Normal' },
              { id: 'relaxed', label: 'Relaxed' },
            ].map(sp => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setLineSpacing(sp.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                  lineSpacing === sp.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#FAF8FD] text-[#524B68] border border-[#ECE5F6] hover:bg-purple-50'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color Swatches + Custom Color Picker */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#706886] flex items-center gap-1">
            <Palette className="w-3 h-3 text-purple-600" />
            Accent Color
          </label>
          <div className="flex items-center gap-1.5 mt-1">
            {COLOR_PRESETS.map(c => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                onClick={() => setAccentColor(c.hex)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  accentColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'scale-110 ring-2 ring-purple-400 border-white'
                    : 'border-slate-200 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <input
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              title="Choose custom accent hex color"
              className="w-7 h-7 rounded-lg cursor-pointer border border-[#ECE5F6] bg-white p-0.5"
            />
          </div>
        </div>

        {/* Skills Layout Mode (Rows vs Table) */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#706886]">Skills Format</label>
          <div className="flex items-center gap-1 mt-0.5">
            <button
              type="button"
              onClick={() => setSkillsDisplayMode('rows')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                skillsDisplayMode === 'rows'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#FAF8FD] text-[#524B68] border border-[#ECE5F6]'
              }`}
            >
              Inline Rows
            </button>
            <button
              type="button"
              onClick={() => setSkillsDisplayMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                skillsDisplayMode === 'table'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#FAF8FD] text-[#524B68] border border-[#ECE5F6]'
              }`}
            >
              <TableIcon className="w-3 h-3" />
              Table Grid
            </button>
          </div>
        </div>
      </div>

      {/* Section Filter Navigation Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#ECE5F6] shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'all', label: 'All Sections', icon: Layers },
          { id: 'header', label: 'Name, Role & Links', icon: User },
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'skills', label: 'Categorized Skills', icon: Wrench },
          { id: 'experience', label: 'Experience', icon: Briefcase },
          { id: 'projects', label: 'Projects & GitHub', icon: FolderGit2 },
          { id: 'education', label: 'Education', icon: GraduationCap },
          { id: 'tables', label: 'Custom Tables', icon: TableIcon },
          { id: 'extras', label: 'Certs & Languages', icon: Award },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                active
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[#524B68] hover:bg-[#FAF8FD] hover:text-[#1E1B2E]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Split Layout: Editor (Left) & Live ATS Paper Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Structured Editor (6 cols on lg) */}
        <div className="lg:col-span-6 space-y-5">
          {/* 1. HEADER: Resume Name, Full Name, Designations & Links */}
          {showSection('header') && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  1. Name, Designations & Contact Links
                </h3>
                <span className="text-[10px] font-semibold text-[#706886]">ATS Header Block</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                  Resume Document Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] font-medium focus:outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Mercer"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] font-bold focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Location (City, State / Country)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. San Francisco, CA or Remote"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Designation / Headline with Quick Presets */}
              <div>
                <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                  Professional Designation / Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Software Engineer | Cloud & AI Architect"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] font-semibold focus:outline-none focus:border-purple-500 focus:bg-white"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-[#9D93B4] mr-1">Quick Designations:</span>
                  {DESIGNATION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDesignation(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#FAF8FD] hover:bg-purple-50 text-[#524B68] hover:text-purple-700 border border-[#ECE5F6] transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Contact Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 234-5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Professional Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="text"
                    placeholder="linkedin.com/in/username"
                    value={linkedin}
                    onChange={e => setLinkedin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    GitHub URL
                  </label>
                  <input
                    type="text"
                    placeholder="github.com/username"
                    value={github}
                    onChange={e => setGithub(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Portfolio / Website
                  </label>
                  <input
                    type="text"
                    placeholder="yourportfolio.dev"
                    value={portfolio}
                    onChange={e => setPortfolio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                  />
                </div>
              </div>

              {/* Additional Custom Links */}
              <div className="pt-2 border-t border-[#ECE5F6] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#524B68] flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-purple-600" />
                    Additional Links (LeetCode, Kaggle, Blog, Google Scholar)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomLinks([...customLinks, { label: 'LeetCode', url: '' }])}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Link
                  </button>
                </div>

                {customLinks.map((lnk, lIdx) => (
                  <div key={lIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. LeetCode)"
                      value={lnk.label}
                      onChange={e => {
                        const updated = [...customLinks];
                        updated[lIdx].label = e.target.value;
                        setCustomLinks(updated);
                      }}
                      className="w-32 px-3 py-1.5 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="https://leetcode.com/u/username"
                      value={lnk.url}
                      onChange={e => {
                        const updated = [...customLinks];
                        updated[lIdx].url = e.target.value;
                        setCustomLinks(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomLinks(customLinks.filter((_, i) => i !== lIdx))}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. PROFESSIONAL SUMMARY SECTION WITH INLINE B/I/U STYLING */}
          {showSection('summary') && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE5F6] pb-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  2. Executive / Professional Summary
                </h3>

                {/* Inline Rich Text B / I / U Toolbar */}
                <div className="flex items-center gap-1 bg-[#FAF8FD] px-2 py-1 rounded-xl border border-[#ECE5F6]">
                  <span className="text-[10px] text-[#706886] mr-1">Select text & style:</span>
                  <button
                    type="button"
                    title="Bold selected text (**bold**)"
                    onClick={() => applyInlineFormatting(summary, setSummary, 'bold', 'summary-textarea')}
                    className="p-1 rounded-lg hover:bg-purple-100 text-[#1E1B2E]"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Italicize selected text (*italic*)"
                    onClick={() => applyInlineFormatting(summary, setSummary, 'italic', 'summary-textarea')}
                    className="p-1 rounded-lg hover:bg-purple-100 text-[#1E1B2E]"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Underline selected text (__underline__)"
                    onClick={() => applyInlineFormatting(summary, setSummary, 'underline', 'summary-textarea')}
                    className="p-1 rounded-lg hover:bg-purple-100 text-[#1E1B2E]"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#9D93B4] mr-1">Insert Role Template:</span>
                {SUMMARY_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSummary(tpl.text)}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              <textarea
                id="summary-textarea"
                rows={4}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Write a 2–4 sentence ATS summary. Use **bold**, *italic*, or __underline__ to emphasize key skills and metrics..."
                className="w-full p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white leading-relaxed"
              />
            </div>
          )}

          {/* 3. CATEGORIZED TECHNICAL SKILLS SECTION */}
          {showSection('skills') && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE5F6] pb-3">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-purple-600" />
                    3. Categorized Technical & Professional Skills
                  </h3>
                  <p className="text-[11px] text-[#706886] mt-0.5">
                    Organize skills into structured domain categories (displayed as rows or bordered table).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReorganizeSkillsAutomatically}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Auto-Categorize Skills
                </button>
              </div>

              {/* Add Skill into Selected Category */}
              <div className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#524B68] block">
                  Add Skill to Category
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedCatIdx}
                    onChange={e => setSelectedCatIdx(Number(e.target.value))}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E] focus:outline-none focus:border-purple-500"
                  >
                    {skillCategories.map((c, idx) => (
                      <option key={idx} value={idx}>{c.category}</option>
                    ))}
                  </select>

                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type skill (e.g. GraphQL, PyTorch, Terraform) & press Enter"
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkillToCategory();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkillToCategory}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition-colors shrink-0"
                    >
                      + Add Skill
                    </button>
                  </div>
                </div>
              </div>

              {/* Skill Categories List */}
              <div className="space-y-3">
                {skillCategories.map((catObj, catIdx) => (
                  <div key={catIdx} className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={catObj.category}
                        onChange={e => {
                          const updated = [...skillCategories];
                          updated[catIdx].category = e.target.value;
                          setSkillCategories(updated);
                        }}
                        className="font-bold text-xs text-[#1E1B2E] bg-transparent border-b border-transparent hover:border-purple-300 focus:border-purple-600 focus:outline-none px-1 py-0.5"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#706886]">
                          {catObj.skills?.length || 0} skills
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(catIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {catObj.skills?.length === 0 ? (
                        <span className="text-[11px] text-[#9D93B4] italic px-1">No skills in this category yet.</span>
                      ) : (
                        catObj.skills.map((sName, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-[#1E1B2E] border border-[#ECE5F6] text-xs font-medium shadow-2xs"
                          >
                            <span>{sName}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkillFromCategory(catIdx, sIdx)}
                              className="text-slate-400 hover:text-rose-600 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Category Row */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="New Category Name (e.g. Cybersecurity, Mobile Development, Testing & QA)"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-colors shrink-0"
                >
                  + Add Category
                </button>
              </div>
            </div>
          )}

          {/* 4. WORK EXPERIENCE SECTION WITH B/I/U & STAR AI */}
          {showSection('experience') && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  4. Professional Work Experience ({experiences.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setExperiences([...experiences, { company: '', role_title: '', employment_type: 'Full-Time', location: '', start_date: '', end_date: 'Present', is_current: false, bullets: [''] }])}
                  className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Position
                </button>
              </div>

              {experiences.map((exp, expIdx) => (
                <div key={expIdx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#1E1B2E]">
                      Position #{expIdx + 1} {exp.role_title && `— ${exp.role_title}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExperiences(experiences.filter((_, i) => i !== expIdx))}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Role / Designation"
                      value={exp.role_title}
                      onChange={e => {
                        const updated = [...experiences];
                        updated[expIdx].role_title = e.target.value;
                        setExperiences(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E]"
                    />
                    <input
                      type="text"
                      placeholder="Company / Organization Name"
                      value={exp.company}
                      onChange={e => {
                        const updated = [...experiences];
                        updated[expIdx].company = e.target.value;
                        setExperiences(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Location"
                        value={exp.location || ''}
                        onChange={e => {
                          const updated = [...experiences];
                          updated[expIdx].location = e.target.value;
                          setExperiences(updated);
                        }}
                        className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                      />
                      <select
                        value={exp.employment_type || ''}
                        onChange={e => {
                          const updated = [...experiences];
                          updated[expIdx].employment_type = e.target.value;
                          setExperiences(updated);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                      >
                        <option value="">Role Type</option>
                        <option value="Full-Time">Full-Time</option>
                        <option value="Internship">Internship</option>
                        <option value="Contract">Contract</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Start (e.g. Jan 2022)"
                        value={exp.start_date || ''}
                        onChange={e => {
                          const updated = [...experiences];
                          updated[expIdx].start_date = e.target.value;
                          setExperiences(updated);
                        }}
                        className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                      />
                      <input
                        type="text"
                        placeholder="End (or Present)"
                        value={exp.end_date || ''}
                        onChange={e => {
                          const updated = [...experiences];
                          updated[expIdx].end_date = e.target.value;
                          updated[expIdx].is_current = e.target.value.toLowerCase() === 'present';
                          setExperiences(updated);
                        }}
                        className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#524B68]">STAR Accomplishment Bullets:</span>
                      <span className="text-[10px] text-[#706886]">Use B / I / U or ✨ STAR AI</span>
                    </div>
                    {exp.bullets.map((bullet, bIdx) => {
                      const bulletElId = `exp-bullet-${expIdx}-${bIdx}`;
                      const updateThisBullet = (val) => {
                        const updated = [...experiences];
                        updated[expIdx].bullets[bIdx] = val;
                        setExperiences(updated);
                      };
                      return (
                        <div key={bIdx} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Bold selected text (**bold**)"
                              onClick={() => applyInlineFormatting(bullet, updateThisBullet, 'bold', bulletElId)}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#ECE5F6] hover:bg-purple-50 text-[10px] font-bold"
                            >
                              B
                            </button>
                            <button
                              type="button"
                              title="Italicize selected text (*italic*)"
                              onClick={() => applyInlineFormatting(bullet, updateThisBullet, 'italic', bulletElId)}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#ECE5F6] hover:bg-purple-50 text-[10px] italic font-serif"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              title="Underline selected text (__underline__)"
                              onClick={() => applyInlineFormatting(bullet, updateThisBullet, 'underline', bulletElId)}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#ECE5F6] hover:bg-purple-50 text-[10px] underline"
                            >
                              U
                            </button>
                          </div>
                          <div className="flex items-start gap-2">
                            <textarea
                              id={bulletElId}
                              rows={2}
                              value={bullet}
                              placeholder="Start with a strong action verb + **quantified metric**..."
                              onChange={e => updateThisBullet(e.target.value)}
                              className="flex-1 p-2.5 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                            />
                            <button
                              type="button"
                              disabled={suggesting}
                              title="Optimize bullet with STAR method AI"
                              onClick={() => handleTriggerStarAI('exp', expIdx, bIdx, bullet)}
                              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 transition-colors shrink-0 shadow-xs"
                            >
                              <Sparkles className="w-4 h-4 text-purple-600" />
                            </button>
                            <button
                              type="button"
                              title="Remove bullet line"
                              onClick={() => {
                                const updated = [...experiences];
                                updated[expIdx].bullets = updated[expIdx].bullets.filter((_, i) => i !== bIdx);
                                setExperiences(updated);
                              }}
                              className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...experiences];
                        updated[expIdx].bullets.push('');
                        setExperiences(updated);
                      }}
                      className="text-[11px] text-purple-700 font-bold hover:underline"
                    >
                      + Add Accomplishment Bullet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. PROJECTS & GITHUB REPO ANALYZER SECTION */}
          {showSection('projects') && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-purple-600" />
                  5. Technical Projects & Portfolio ({projects.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setProjects([...projects, { title: '', technologies: [], date: '', repo_url: '', live_url: '', bullets: [''] }])}
                  className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>

              {/* GitHub Repo AI Quick-Import Box */}
              <form onSubmit={handleAnalyzeRepo} className="p-4 rounded-2xl bg-gradient-to-tr from-purple-50/70 to-indigo-50/50 border border-purple-200/80 space-y-2">
                <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                  <Code2 className="w-3.5 h-3.5 inline mr-1 text-purple-700" />
                  AI GitHub Repository Importer
                </label>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="e.g. https://github.com/fastapi/fastapi or username/repository"
                    value={repoUrlInput}
                    onChange={e => setRepoUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                  />
                  <button
                    type="submit"
                    disabled={analyzingRepo}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {analyzingRepo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Import Repo</span>
                  </button>
                </div>
                {repoAnalysisError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{repoAnalysisError}</span>
                  </div>
                )}
              </form>

              {projects.map((proj, projIdx) => (
                <div key={projIdx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#1E1B2E]">
                      Project #{projIdx + 1} {proj.title && `— ${proj.title}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProjects(projects.filter((_, i) => i !== projIdx))}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Project Title"
                      value={proj.title}
                      onChange={e => {
                        const updated = [...projects];
                        updated[projIdx].title = e.target.value;
                        setProjects(updated);
                      }}
                      className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E]"
                    />
                    <input
                      type="text"
                      placeholder="Date / Year (e.g. 2025)"
                      value={proj.date || ''}
                      onChange={e => {
                        const updated = [...projects];
                        updated[projIdx].date = e.target.value;
                        setProjects(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Technologies Used (comma-separated, e.g. Python, FastAPI, React, Docker)"
                    value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}
                    onChange={e => {
                      const updated = [...projects];
                      updated[projIdx].technologies = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setProjects(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="GitHub Repository URL"
                      value={proj.repo_url || ''}
                      onChange={e => {
                        const updated = [...projects];
                        updated[projIdx].repo_url = e.target.value;
                        setProjects(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                    <input
                      type="text"
                      placeholder="Live Demo URL (optional)"
                      value={proj.live_url || ''}
                      onChange={e => {
                        const updated = [...projects];
                        updated[projIdx].live_url = e.target.value;
                        setProjects(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-[#524B68]">Project Accomplishment Bullets:</span>
                    {(proj.bullets || ['']).map((bullet, bIdx) => {
                      const pBulletId = `proj-bullet-${projIdx}-${bIdx}`;
                      const updateProjBullet = (val) => {
                        const updated = [...projects];
                        if (!updated[projIdx].bullets) updated[projIdx].bullets = [];
                        updated[projIdx].bullets[bIdx] = val;
                        setProjects(updated);
                      };
                      return (
                        <div key={bIdx} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => applyInlineFormatting(bullet, updateProjBullet, 'bold', pBulletId)}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#ECE5F6] hover:bg-purple-50 text-[10px] font-bold"
                            >
                              B
                            </button>
                            <button
                              type="button"
                              onClick={() => applyInlineFormatting(bullet, updateProjBullet, 'italic', pBulletId)}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#ECE5F6] hover:bg-purple-50 text-[10px] italic font-serif"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              onClick={() => applyInlineFormatting(bullet, updateProjBullet, 'underline', pBulletId)}
                              className="px-1.5 py-0.5 rounded bg-white border border-[#ECE5F6] hover:bg-purple-50 text-[10px] underline"
                            >
                              U
                            </button>
                          </div>
                          <div className="flex items-start gap-2">
                            <textarea
                              id={pBulletId}
                              rows={2}
                              value={bullet}
                              placeholder="Describe architecture, scale, and **measurable result**..."
                              onChange={e => updateProjBullet(e.target.value)}
                              className="flex-1 p-2.5 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] font-sans leading-relaxed"
                            />
                            <button
                              type="button"
                              disabled={suggesting}
                              onClick={() => handleTriggerStarAI('proj', projIdx, bIdx, bullet)}
                              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 shrink-0"
                            >
                              <Sparkles className="w-4 h-4 text-purple-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...projects];
                                updated[projIdx].bullets = updated[projIdx].bullets.filter((_, i) => i !== bIdx);
                                setProjects(updated);
                              }}
                              className="p-2.5 text-slate-400 hover:text-rose-600 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...projects];
                        if (!updated[projIdx].bullets) updated[projIdx].bullets = [];
                        updated[projIdx].bullets.push('');
                        setProjects(updated);
                      }}
                      className="text-[11px] text-purple-700 font-bold hover:underline"
                    >
                      + Add Project Bullet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. EDUCATION & ACADEMIC QUALIFICATIONS SECTION */}
          {showSection('education') && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  6. Education & Academic Qualifications ({educations.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setEducations([...educations, { degree: '', field_of_study: '', institution: '', location: '', start_date: '', end_date: '', gpa: '', honors: '' }])}
                  className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Education
                </button>
              </div>

              {educations.map((edu, eduIdx) => (
                <div key={eduIdx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-2.5 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#1E1B2E]">Education #{eduIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setEducations(educations.filter((_, i) => i !== eduIdx))}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="University / Institution Name"
                      value={edu.institution || ''}
                      onChange={e => {
                        const updated = [...educations];
                        updated[eduIdx].institution = e.target.value;
                        setEducations(updated);
                      }}
                      className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E]"
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. Berkeley, CA)"
                      value={edu.location || ''}
                      onChange={e => {
                        const updated = [...educations];
                        updated[eduIdx].location = e.target.value;
                        setEducations(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Degree (e.g. B.S., B.Tech, M.S.)"
                      value={edu.degree || ''}
                      onChange={e => {
                        const updated = [...educations];
                        updated[eduIdx].degree = e.target.value;
                        setEducations(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                    <input
                      type="text"
                      placeholder="Major / Field of Study (e.g. Computer Science)"
                      value={edu.field_of_study || ''}
                      onChange={e => {
                        const updated = [...educations];
                        updated[eduIdx].field_of_study = e.target.value;
                        setEducations(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Start Year (2018)"
                      value={edu.start_date || ''}
                      onChange={e => {
                        const updated = [...educations];
                        updated[eduIdx].start_date = e.target.value;
                        setEducations(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                    <input
                      type="text"
                      placeholder="Graduation (2022)"
                      value={edu.end_date || ''}
                      onChange={e => {
                        const updated = [...educations];
                        updated[eduIdx].end_date = e.target.value;
                        setEducations(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                    <input
                      type="text"
                      placeholder="GPA / CGPA (e.g. 3.85)"
                      value={edu.gpa || ''}
                      onChange={e => {
                        const updated = [...educations];
                        updated[eduIdx].gpa = e.target.value;
                        setEducations(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Relevant Coursework, Academic Honors, or Societies (optional)"
                    value={edu.honors || ''}
                    onChange={e => {
                      const updated = [...educations];
                      updated[eduIdx].honors = e.target.value;
                      setEducations(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 7. CUSTOM MULTI-COLUMN TABLES SECTION */}
          {showSection('tables') && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-purple-600" />
                    7. Custom Tables & Matrices ({customTables.length})
                  </h3>
                  <p className="text-[11px] text-[#706886] mt-0.5">
                    Add structured tables for Engineering Metrics, Academic Semesters, or Publications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomTable}
                  className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Table
                </button>
              </div>

              {customTables.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#FAF8FD] border border-dashed border-purple-200 text-center space-y-2">
                  <p className="text-xs text-[#706886]">
                    No custom tables added yet. You can also toggle <b>Table Grid</b> in the top toolbar to render your Technical Skills as a table!
                  </p>
                  <button
                    type="button"
                    onClick={handleAddCustomTable}
                    className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold"
                  >
                    + Insert Sample Engineering Metrics Table
                  </button>
                </div>
              ) : (
                customTables.map((tbl, tIdx) => (
                  <div key={tIdx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={tbl.title}
                        placeholder="Table Section Heading (e.g. Key Engineering Benchmarks)"
                        onChange={e => {
                          const updated = [...customTables];
                          updated[tIdx].title = e.target.value;
                          setCustomTables(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#ECE5F6] text-xs font-bold text-[#1E1B2E]"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomTables(customTables.filter((_, i) => i !== tIdx))}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Table Column Headers */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[#706886]">Columns</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...customTables];
                              updated[tIdx].headers.push(`Column ${updated[tIdx].headers.length + 1}`);
                              updated[tIdx].rows = updated[tIdx].rows.map(r => [...r, '']);
                              setCustomTables(updated);
                            }}
                            className="text-[10px] font-bold text-purple-700 hover:underline"
                          >
                            + Add Column
                          </button>
                          {tbl.headers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...customTables];
                                updated[tIdx].headers.pop();
                                updated[tIdx].rows = updated[tIdx].rows.map(r => r.slice(0, -1));
                                setCustomTables(updated);
                              }}
                              className="text-[10px] font-bold text-rose-600 hover:underline"
                            >
                              - Remove Last Col
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tbl.headers.length}, minmax(0, 1fr))` }}>
                        {tbl.headers.map((h, hIdx) => (
                          <input
                            key={hIdx}
                            type="text"
                            value={h}
                            onChange={e => {
                              const updated = [...customTables];
                              updated[tIdx].headers[hIdx] = e.target.value;
                              setCustomTables(updated);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-950"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Table Rows */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-[#706886] block">Rows</span>
                      {tbl.rows.map((row, rIdx) => (
                        <div key={rIdx} className="flex items-center gap-1.5">
                          <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tbl.headers.length}, minmax(0, 1fr))` }}>
                            {row.map((cell, cIdx) => (
                              <input
                                key={cIdx}
                                type="text"
                                value={cell}
                                placeholder="Cell value..."
                                onChange={e => {
                                  const updated = [...customTables];
                                  updated[tIdx].rows[rIdx][cIdx] = e.target.value;
                                  setCustomTables(updated);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-[#ECE5F6] text-[11px] text-[#1E1B2E]"
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...customTables];
                              updated[tIdx].rows = updated[tIdx].rows.filter((_, i) => i !== rIdx);
                              setCustomTables(updated);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...customTables];
                          updated[tIdx].rows.push(new Array(tbl.headers.length).fill(''));
                          setCustomTables(updated);
                        }}
                        className="text-[11px] font-bold text-purple-700 hover:underline pt-1 inline-block"
                      >
                        + Add Table Row
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 8. CERTIFICATIONS & LANGUAGES SECTION */}
          {showSection('extras') && (
            <div className="space-y-5">
              {/* Certifications & Achievements */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    8. Certifications & Honors ({certifications.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCertifications([...certifications, { name: '', issuer: '', date: '', url: '' }])}
                    className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Certification
                  </button>
                </div>

                {certifications.map((cert, cIdx) => (
                  <div key={cIdx} className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Certification or Award Title"
                        value={cert.name}
                        onChange={e => {
                          const updated = [...certifications];
                          updated[cIdx].name = e.target.value;
                          setCertifications(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E]"
                      />
                      <button
                        type="button"
                        onClick={() => setCertifications(certifications.filter((_, i) => i !== cIdx))}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Issuer (e.g. Amazon Web Services)"
                        value={cert.issuer || ''}
                        onChange={e => {
                          const updated = [...certifications];
                          updated[cIdx].issuer = e.target.value;
                          setCertifications(updated);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                      />
                      <input
                        type="text"
                        placeholder="Year / Date (e.g. 2025)"
                        value={cert.date || ''}
                        onChange={e => {
                          const updated = [...certifications];
                          updated[cIdx].date = e.target.value;
                          setCertifications(updated);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                      />
                      <input
                        type="text"
                        placeholder="Credential URL (optional)"
                        value={cert.url || ''}
                        onChange={e => {
                          const updated = [...certifications];
                          updated[cIdx].url = e.target.value;
                          setCertifications(updated);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Spoken Languages */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-600" />
                    9. Languages & Proficiencies ({languages.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setLanguages([...languages, { language: '', proficiency: 'Full Professional' }])}
                    className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Language
                  </button>
                </div>

                <div className="space-y-2.5">
                  {languages.map((langObj, lIdx) => (
                    <div key={lIdx} className="flex items-center gap-2.5">
                      <input
                        type="text"
                        placeholder="Language (e.g. English, Hindi, Spanish, German)"
                        value={langObj.language}
                        onChange={e => {
                          const updated = [...languages];
                          updated[lIdx].language = e.target.value;
                          setLanguages(updated);
                        }}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs font-semibold text-[#1E1B2E]"
                      />
                      <select
                        value={langObj.proficiency}
                        onChange={e => {
                          const updated = [...languages];
                          updated[lIdx].proficiency = e.target.value;
                          setLanguages(updated);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] font-medium"
                      >
                        <option value="Native / Bilingual">Native / Bilingual</option>
                        <option value="Full Professional">Full Professional</option>
                        <option value="Professional Working">Professional Working</option>
                        <option value="Limited Working">Limited Working</option>
                        <option value="Elementary">Elementary</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setLanguages(languages.filter((_, i) => i !== lIdx))}
                        className="p-2 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Professional ATS Paper Preview (6 cols on lg) */}
        <div className="lg:col-span-6 sticky top-6 space-y-3">
          {/* Template Style Switcher Bar */}
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-[#ECE5F6] shadow-xs flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#524B68] flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-purple-600" />
              Live ATS Paper Layout:
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'executive', label: 'Executive Classic' },
                { id: 'modern', label: 'Modern Technical' },
                { id: 'academic', label: 'Minimalist Academic' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAtsTemplate(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    atsTemplate === t.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#FAF8FD] text-[#524B68] hover:bg-purple-50 border border-[#ECE5F6]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Sheet Container */}
          <div className={`bg-white p-7 sm:p-10 rounded-3xl border border-[#ECE5F6] shadow-saas text-slate-900 min-h-[780px] ${previewFontClass} ${previewTextSizeClass} ${previewLeadingClass}`}>
            {/* ATS HEADER */}
            <div
              className={`pb-3.5 border-b-2 ${atsTemplate === 'modern' ? 'text-left' : 'text-center'}`}
              style={{ borderColor: accentColor }}
            >
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
                {fullName || 'CANDIDATE NAME'}
              </h2>

              {designation && (
                <p className="text-xs font-bold mt-1 tracking-wide" style={{ color: accentColor }}>
                  {designation}
                </p>
              )}

              <div className={`text-[11px] text-slate-600 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 ${
                atsTemplate === 'modern' ? 'justify-start' : 'justify-center'
              }`}>
                {email && (
                  <a href={`mailto:${email}`} className="hover:underline font-medium" style={{ color: accentColor }}>
                    {email}
                  </a>
                )}
                {phone && <span>• {phone}</span>}
                {location && <span>• {location}</span>}
                {linkedin && (
                  <span>
                    • <a href={formatUrl(linkedin)} target="_blank" rel="noreferrer" className="hover:underline font-semibold" style={{ color: accentColor }}>LinkedIn</a>
                  </span>
                )}
                {github && (
                  <span>
                    • <a href={formatUrl(github)} target="_blank" rel="noreferrer" className="hover:underline font-semibold" style={{ color: accentColor }}>GitHub</a>
                  </span>
                )}
                {portfolio && (
                  <span>
                    • <a href={formatUrl(portfolio)} target="_blank" rel="noreferrer" className="hover:underline font-semibold" style={{ color: accentColor }}>Portfolio</a>
                  </span>
                )}
                {customLinks.map((lnk, idx) => (
                  lnk.url && (
                    <span key={idx}>
                      • <a href={formatUrl(lnk.url)} target="_blank" rel="noreferrer" className="hover:underline font-semibold" style={{ color: accentColor }}>{lnk.label || 'Link'}</a>
                    </span>
                  )
                ))}
              </div>
            </div>

            {/* 1. PROFESSIONAL SUMMARY PREVIEW */}
            {summary && (
              <div className="mt-4">
                <h4
                  className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-1.5"
                  style={{ color: accentColor, borderColor: accentColor }}
                >
                  Professional Summary
                </h4>
                <p className="text-slate-800">
                  {renderRichText(summary)}
                </p>
              </div>
            )}

            {/* 2. CATEGORIZED TECHNICAL SKILLS PREVIEW (Rows or Bordered Table) */}
            {skillCategories.some(c => c.skills && c.skills.length > 0) && (
              <div className="mt-4">
                <h4
                  className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-1.5"
                  style={{ color: accentColor, borderColor: accentColor }}
                >
                  Technical Skills
                </h4>

                {skillsDisplayMode === 'table' ? (
                  <table className="w-full border-collapse border border-slate-300 text-left mt-1">
                    <tbody>
                      {skillCategories.map((catObj, idx) => (
                        catObj.skills && catObj.skills.length > 0 && (
                          <tr key={idx} className="border-b border-slate-300">
                            <td className="p-1.5 bg-slate-50 font-bold text-slate-900 border-r border-slate-300 w-1/3">
                              {catObj.category}
                            </td>
                            <td className="p-1.5 text-slate-800">
                              {catObj.skills.join(', ')}
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-1 text-slate-800">
                    {skillCategories.map((catObj, idx) => (
                      catObj.skills && catObj.skills.length > 0 && (
                        <div key={idx}>
                          <span className="font-bold text-slate-900">{catObj.category}: </span>
                          <span>{catObj.skills.join(', ')}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. WORK EXPERIENCE PREVIEW */}
            {experiences.some(e => e.company || e.role_title) && (
              <div className="mt-4">
                <h4
                  className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-2"
                  style={{ color: accentColor, borderColor: accentColor }}
                >
                  Work Experience
                </h4>
                <div className="space-y-3">
                  {experiences.map((exp, idx) => (
                    (exp.company || exp.role_title) && (
                      <div key={idx}>
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="font-bold text-slate-900">
                            {exp.role_title}
                            {exp.employment_type && <span className="font-normal text-slate-600"> ({exp.employment_type})</span>}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700 shrink-0">
                            {exp.start_date} {(exp.start_date || exp.end_date) && '–'} {exp.is_current ? 'Present' : exp.end_date}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline text-[11px] italic text-slate-700 mb-1">
                          <span className="font-medium">{exp.company}</span>
                          {exp.location && <span>{exp.location}</span>}
                        </div>
                        <ul className="space-y-0.5 text-slate-800 list-disc pl-4">
                          {exp.bullets.map((b, bIdx) => (
                            b.trim() && <li key={bIdx}>{renderRichText(b)}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* 4. PROJECTS PREVIEW */}
            {projects.some(p => p.title || (p.bullets && p.bullets.some(Boolean))) && (
              <div className="mt-4">
                <h4
                  className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-2"
                  style={{ color: accentColor, borderColor: accentColor }}
                >
                  Projects & Technical Highlights
                </h4>
                <div className="space-y-2.5">
                  {projects.map((proj, idx) => (
                    (proj.title || (proj.bullets && proj.bullets.some(Boolean))) && (
                      <div key={idx}>
                        <div className="flex justify-between items-baseline gap-2 flex-wrap">
                          <div>
                            <span className="font-bold text-slate-900">{proj.title}</span>
                            {proj.technologies && proj.technologies.length > 0 && (
                              <span className="italic text-slate-600 ml-1.5 text-[11px]">
                                | {Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}
                              </span>
                            )}
                            {proj.repo_url && (
                              <a href={formatUrl(proj.repo_url)} target="_blank" rel="noreferrer" className="hover:underline font-semibold ml-2 text-[11px]" style={{ color: accentColor }}>
                                [GitHub]
                              </a>
                            )}
                            {proj.live_url && (
                              <a href={formatUrl(proj.live_url)} target="_blank" rel="noreferrer" className="hover:underline font-semibold ml-1.5 text-[11px]" style={{ color: accentColor }}>
                                [Live Demo]
                              </a>
                            )}
                          </div>
                          {proj.date && (
                            <span className="text-[11px] font-bold text-slate-700 shrink-0">{proj.date}</span>
                          )}
                        </div>
                        {proj.bullets && proj.bullets.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5 text-slate-800 list-disc pl-4">
                            {proj.bullets.map((b, bIdx) => (
                              b.trim() && <li key={bIdx}>{renderRichText(b)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* 5. EDUCATION PREVIEW */}
            {educations.some(ed => ed.institution || ed.degree) && (
              <div className="mt-4">
                <h4
                  className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-2"
                  style={{ color: accentColor, borderColor: accentColor }}
                >
                  Education
                </h4>
                <div className="space-y-2">
                  {educations.map((edu, idx) => (
                    (edu.institution || edu.degree) && (
                      <div key={idx}>
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-slate-900">{edu.institution || 'University / Institution'}</span>
                          <span className="text-[11px] font-bold text-slate-700">
                            {edu.start_date} {(edu.start_date || edu.end_date) && '–'} {edu.end_date}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline text-[11px] italic text-slate-700">
                          <span>
                            {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                          </span>
                          <span>
                            {edu.gpa ? `GPA: ${edu.gpa}` : edu.location}
                          </span>
                        </div>
                        {edu.honors && (
                          <p className="text-[11px] text-slate-700 mt-0.5">
                            <span className="font-semibold">Coursework & Honors:</span> {renderRichText(edu.honors)}
                          </p>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* 6. CUSTOM TABLES PREVIEW */}
            {customTables.map((tbl, tIdx) => (
              (tbl.headers?.length > 0 || tbl.rows?.length > 0) && (
                <div key={tIdx} className="mt-4">
                  <h4
                    className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-2"
                    style={{ color: accentColor, borderColor: accentColor }}
                  >
                    {tbl.title || 'Additional Details'}
                  </h4>
                  <table className="w-full border-collapse border border-slate-300 text-left">
                    {tbl.headers?.length > 0 && (
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                          {tbl.headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-1.5 font-bold text-slate-900 border-r border-slate-300">
                              {renderRichText(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {tbl.rows?.map((r, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-300">
                          {r.map((cell, cIdx) => (
                            <td key={cIdx} className="p-1.5 text-slate-800 border-r border-slate-300">
                              {renderRichText(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ))}

            {/* 7. CERTIFICATIONS & ACHIEVEMENTS PREVIEW */}
            {certifications.some(c => c.name) && (
              <div className="mt-4">
                <h4
                  className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-1.5"
                  style={{ color: accentColor, borderColor: accentColor }}
                >
                  Certifications & Honors
                </h4>
                <ul className="space-y-0.5 text-slate-800 list-disc pl-4">
                  {certifications.map((cert, idx) => (
                    cert.name && (
                      <li key={idx}>
                        <span className="font-bold text-slate-900">{renderRichText(cert.name)}</span>
                        {cert.issuer && <span> — {cert.issuer}</span>}
                        {cert.date && <span className="text-slate-600"> ({cert.date})</span>}
                        {cert.url && (
                          <a href={formatUrl(cert.url)} target="_blank" rel="noreferrer" className="hover:underline font-semibold ml-1.5 text-[11px]" style={{ color: accentColor }}>
                            [Credential]
                          </a>
                        )}
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}

            {/* 8. LANGUAGES PREVIEW */}
            {languages.some(l => l.language) && (
              <div className="mt-4">
                <h4
                  className="text-[11px] font-extrabold uppercase tracking-wider border-b pb-0.5 mb-1.5"
                  style={{ color: accentColor, borderColor: accentColor }}
                >
                  Languages
                </h4>
                <p className="text-slate-800">
                  {languages
                    .filter(l => l.language)
                    .map((l) => `${l.language} (${l.proficiency})`)
                    .join(' • ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paste & Auto-Fix Messy Resume Text Modal */}
      {showMessyPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#ECE5F6] p-6 sm:p-7 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#ECE5F6] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#1E1B2E]">
                    AI Messy Resume Text & Layout Fixer
                  </h3>
                  <p className="text-xs text-[#706886]">
                    Paste unformatted or messy resume text below. AI will extract sections, categorize skills, fix dates, and format STAR bullets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMessyPasteModal(false)}
                className="p-1.5 rounded-xl bg-[#FAF8FD] text-[#706886] hover:text-[#1E1B2E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={9}
              value={messyRawText}
              onChange={e => setMessyRawText(e.target.value)}
              placeholder={`Paste messy or unformatted resume text here, e.g.:\nALEX MERCER\nalex@gmail.com | 5551234567\nSummary\nworked on python and react microservices...\nExperience\nSoftware Engineer | Acme Corp | 2021 - present\n- helped with building apis in fastapi reducing latency by 35%`}
              className="w-full p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs font-mono text-[#1E1B2E] focus:outline-none focus:border-purple-500 leading-relaxed"
            />

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMessyPasteModal(false)}
                className="px-4 py-2.5 rounded-2xl bg-[#FAF8FD] text-xs font-semibold text-[#524B68] border border-[#ECE5F6]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={autoFormatting || !messyRawText.trim()}
                onClick={() => handleRunLLMAutoFormat(messyRawText)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50"
              >
                {autoFormatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span>{autoFormatting ? 'Cleaning & Structuring...' : 'Parse & Auto-Fix Layout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAR Suggestion Modal */}
      <BulletSuggestionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        originalBullet={modalData.original}
        suggestedBullet={modalData.suggested}
        changesExplained={modalData.changes}
        onAccept={handleApplyStarBullet}
      />
    </div>
  );
}

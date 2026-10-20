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
  ExternalLink,
  Code2,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function ResumeBuilder() {
  const [resumes, setResumes] = useState([]);
  const [activeResumeId, setActiveResumeId] = useState(null);
  const [title, setTitle] = useState('Senior Full-Stack Engineer Resume');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState(['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Docker']);
  const [skillInput, setSkillInput] = useState('');

  const [experiences, setExperiences] = useState([
    {
      company: 'CloudScale AI',
      role_title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      start_date: '2022',
      end_date: 'Present',
      is_current: true,
      bullets: [
        'Architected and deployed asynchronous microservices using FastAPI and Docker, handling 40k req/min with 99.9% uptime.',
        'Optimized PostgreSQL query execution plans, reducing average endpoint latency by 35%.'
      ]
    }
  ]);

  const [educations, setEducations] = useState([
    {
      degree: 'B.S. in Computer Science',
      field_of_study: 'Software Engineering',
      institution: 'University of California, Berkeley',
      start_date: '2018',
      end_date: '2022',
      gpa: '3.82'
    }
  ]);

  const [projects, setProjects] = useState([
    {
      title: 'Real-time Event Streaming Engine',
      technologies: ['Python', 'Kafka', 'Redis'],
      repo_url: 'https://github.com/example/stream-engine',
      live_url: '',
      bullets: [
        'Distributed pub/sub messaging engine processing 100k events/sec with fault tolerance and automatic backpressure.',
        'Engineered Redis caching layer, decreasing downstream processing overhead by 40%.'
      ]
    }
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

  const loadResumeData = (resObj) => {
    if (!resObj) return;
    setActiveResumeId(resObj.id);
    setTitle(resObj.title || 'My Professional Resume');
    const data = resObj.structured_json || {};
    const contact = data.contact_info || {};
    setFullName(data.full_name || contact.full_name || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setLocation(contact.location || '');
    setLinkedin(contact.linkedin || '');
    setGithub(contact.github || '');
    setSummary(data.summary || '');
    
    if (data.skills && Array.isArray(data.skills)) {
      setSkills(data.skills);
    } else if (data.extracted_skills && Array.isArray(data.extracted_skills)) {
      setSkills(data.extracted_skills.map(s => s.canonical_name || s.name));
    }
    
    if (data.experiences && data.experiences.length > 0) setExperiences(data.experiences);
    if (data.educations && data.educations.length > 0) setEducations(data.educations);
    if (data.projects && data.projects.length > 0) {
      const normalizedProjects = data.projects.map(p => ({
        title: p.title || 'Project',
        technologies: p.technologies || [],
        repo_url: p.repo_url || '',
        live_url: p.live_url || '',
        bullets: p.bullets || (p.description ? [p.description] : [])
      }));
      setProjects(normalizedProjects);
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
    } catch (err) {
      alert("Failed to load resume data.");
    }
  };

  const handleImportFromMasterProfile = async () => {
    try {
      const res = await api.get('/profile');
      const p = res.data;
      if (p) {
        if (p.headline) setTitle(p.headline);
        if (p.summary) setSummary(p.summary);
        if (p.phone) setPhone(p.phone);
        if (p.location) setLocation(p.location);
        if (p.linkedin_url) setLinkedin(p.linkedin_url);
        if (p.github_url) setGithub(p.github_url);
        if (p.user_skills && p.user_skills.length > 0) {
          setSkills(p.user_skills.map(s => s.skill_name));
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
            repo_url: proj.repo_url || '',
            live_url: proj.live_url || '',
            bullets: proj.bullets || (proj.description ? [proj.description] : [])
          }));
          setProjects(normProjects);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert("Failed to load Master Profile.");
    }
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
      structured_json: {
        title,
        full_name: fullName,
        contact_info: { full_name: fullName, email, phone, location, linkedin, github },
        summary,
        skills,
        experiences,
        educations,
        projects
      }
    };

    try {
      if (activeResumeId) {
        await api.put(`/resume/${activeResumeId}`, payload);
      } else {
        const res = await api.post('/resume/create', payload);
        setActiveResumeId(res.data.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchResumes();
    } catch (err) {
      alert("Failed to save resume.");
    }
  };

  const handleExportPDF = async () => {
    if (!activeResumeId) {
      await handleSaveResume();
    }
    try {
      const response = await api.get(`/resume/${activeResumeId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_ATS.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Error generating PDF. Please ensure resume is saved first.");
    }
  };

  const handleTriggerStarAI = async (type, index, bulletIndex, bulletText) => {
    setSuggesting(true);
    setTargetBulletTarget({ type, index, bulletIndex });
    
    const contextRole = type === 'exp' 
      ? (experiences[index]?.role_title || 'Software Engineer')
      : (projects[index]?.title || 'Software Project');

    const targetSkill = skills[0] || (projects[index]?.technologies?.[0] || 'Python');

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

  return (
    <div className="space-y-7 animate-fadeIn pb-16">
      {/* Top Header & Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold mb-1.5">
            ATS Optimized Formatting
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-[#1E1B2E] flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Resume Builder
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-lime-700 bg-lime-50 border border-lime-200 px-3 py-1.5 rounded-full flex items-center gap-1 font-semibold animate-pulse">
              <Check className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            type="button"
            onClick={handleAutoFillFromResume}
            title="Auto-fill all fields from your latest uploaded resume"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            Auto-Fill from Resume
          </button>
          <button
            type="button"
            onClick={handleImportFromMasterProfile}
            title="Load career records from your Master Profile"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 text-[#2E2842] border border-[#ECE5F6] text-xs font-semibold transition-colors shadow-sm"
          >
            <User className="w-3.5 h-3.5 text-purple-600" />
            Load Master Profile
          </button>
          <button
            onClick={handleSaveResume}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 text-[#2E2842] border border-[#ECE5F6] text-xs font-semibold transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 text-purple-600" />
            Save Resume
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 hover:shadow-lg transition-all active:scale-[0.99]"
          >
            <Download className="w-4 h-4" />
            Export ATS PDF
          </button>
        </div>
      </div>

      {/* Main Split Layout: Editor (Left) & Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Form Editor */}
        <div className="space-y-5">
          {/* Resume Name */}
          <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              Resume Document Name
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] font-medium focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Contact Details */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Contact Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
              />
              <input
                type="text"
                placeholder="Location (City, State)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
              />
              <input
                type="text"
                placeholder="LinkedIn Profile URL"
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
              />
              <input
                type="text"
                placeholder="GitHub Profile URL"
                value={github}
                onChange={e => setGithub(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Professional Summary
            </h3>
            <textarea
              rows={3}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Concise overview of your technical background, domain focus, and impact..."
              className="w-full p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white leading-relaxed"
            />
          </div>

          {/* Technical Skills */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Core Technical Skills
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add technology (e.g. Docker, Redis)"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && skillInput.trim()) {
                    e.preventDefault();
                    if (!skills.includes(skillInput.trim())) setSkills([...skills, skillInput.trim()]);
                    setSkillInput('');
                  }
                }}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (skillInput.trim() && !skills.includes(skillInput.trim())) {
                    setSkills([...skills, skillInput.trim()]);
                    setSkillInput('');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-800 border border-purple-200 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {skills.map((s, idx) => (
                <span key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-medium">
                  {s}
                  <button onClick={() => setSkills(skills.filter((_, i) => i !== idx))} className="text-purple-400 hover:text-red-500 font-bold ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Work Experience
              </h3>
              <button
                type="button"
                onClick={() => setExperiences([...experiences, { company: '', role_title: '', location: '', start_date: '', end_date: '', is_current: false, bullets: [''] }])}
                className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Position
              </button>
            </div>

            {experiences.map((exp, expIdx) => (
              <div key={expIdx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Position #{expIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setExperiences(experiences.filter((_, i) => i !== expIdx))}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Role Title"
                    value={exp.role_title}
                    onChange={e => {
                      const updated = [...experiences];
                      updated[expIdx].role_title = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={exp.company}
                    onChange={e => {
                      const updated = [...experiences];
                      updated[expIdx].company = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={exp.location || ''}
                    onChange={e => {
                      const updated = [...experiences];
                      updated[expIdx].location = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Start (e.g. 2022)"
                      value={exp.start_date || ''}
                      onChange={e => {
                        const updated = [...experiences];
                        updated[expIdx].start_date = e.target.value;
                        setExperiences(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                    />
                    <input
                      type="text"
                      placeholder="End (or Present)"
                      value={exp.end_date || ''}
                      onChange={e => {
                        const updated = [...experiences];
                        updated[expIdx].end_date = e.target.value;
                        setExperiences(updated);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#706886]">Accomplishment Bullets:</span>
                  {exp.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2">
                      <textarea
                        rows={2}
                        value={bullet}
                        placeholder="Detail an achievement with action verb and quantifiable metric..."
                        onChange={e => {
                          const updated = [...experiences];
                          updated[expIdx].bullets[bIdx] = e.target.value;
                          setExperiences(updated);
                        }}
                        className="flex-1 p-2.5 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                      />
                      <button
                        type="button"
                        title="Optimize bullet with STAR method AI"
                        onClick={() => handleTriggerStarAI('exp', expIdx, bIdx, bullet)}
                        className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 transition-colors shrink-0 shadow-sm"
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
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...experiences];
                      updated[expIdx].bullets.push('');
                      setExperiences(updated);
                    }}
                    className="text-[11px] text-purple-700 font-semibold hover:underline"
                  >
                    + Add bullet line
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Projects & Portfolio Section (NEW with GitHub AI Analyzer!) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  Projects & Technical Highlights
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProjects([...projects, { title: '', technologies: [], repo_url: '', live_url: '', bullets: [''] }])}
                className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            {/* GitHub Repo AI Quick-Import Box */}
            <form onSubmit={handleAnalyzeRepo} className="p-4 rounded-2xl bg-gradient-to-tr from-purple-50/60 to-indigo-50/40 border border-purple-200/80 space-y-2">
              <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5 inline mr-1 text-purple-700" />
                AI GitHub Repo Analyzer
              </label>
              <p className="text-xs text-[#5C5572]">
                Paste any public GitHub repository link to auto-detect title, technologies, and STAR accomplishment bullets.
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. https://github.com/facebook/react or username/repository"
                  value={repoUrlInput}
                  onChange={e => setRepoUrlInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={analyzingRepo}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {analyzingRepo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Analyze Repo
                    </>
                  )}
                </button>
              </div>
              {repoAnalysisError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{repoAnalysisError}</span>
                </div>
              )}
            </form>

            {/* List of Projects */}
            {projects.map((proj, projIdx) => (
              <div key={projIdx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Project #{projIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setProjects(projects.filter((_, i) => i !== projIdx))}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={proj.title}
                    onChange={e => {
                      const updated = [...projects];
                      updated[projIdx].title = e.target.value;
                      setProjects(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                  />
                  <input
                    type="text"
                    placeholder="Technologies (comma-separated, e.g. React, Node.js)"
                    value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies}
                    onChange={e => {
                      const updated = [...projects];
                      updated[projIdx].technologies = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setProjects(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                  />
                  <input
                    type="text"
                    placeholder="GitHub Repository URL"
                    value={proj.repo_url || ''}
                    onChange={e => {
                      const updated = [...projects];
                      updated[projIdx].repo_url = e.target.value;
                      setProjects(updated);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
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
                    className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Bullets for Project */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#706886]">Project Bullets:</span>
                  {(proj.bullets || ['']).map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-2">
                      <textarea
                        rows={2}
                        value={bullet}
                        placeholder="Accomplishment bullet highlighting system architecture, performance, or scope..."
                        onChange={e => {
                          const updated = [...projects];
                          if (!updated[projIdx].bullets) updated[projIdx].bullets = [];
                          updated[projIdx].bullets[bIdx] = e.target.value;
                          setProjects(updated);
                        }}
                        className="flex-1 p-2.5 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                      />
                      <button
                        type="button"
                        title="Optimize bullet with STAR method AI"
                        onClick={() => handleTriggerStarAI('proj', projIdx, bIdx, bullet)}
                        className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 transition-colors shrink-0 shadow-sm"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </button>
                      <button
                        type="button"
                        title="Remove bullet line"
                        onClick={() => {
                          const updated = [...projects];
                          updated[projIdx].bullets = updated[projIdx].bullets.filter((_, i) => i !== bIdx);
                          setProjects(updated);
                        }}
                        className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...projects];
                      if (!updated[projIdx].bullets) updated[projIdx].bullets = [];
                      updated[projIdx].bullets.push('');
                      setProjects(updated);
                    }}
                    className="text-[11px] text-purple-700 font-semibold hover:underline"
                  >
                    + Add project bullet
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Education
              </h3>
              <button
                type="button"
                onClick={() => setEducations([...educations, { degree: '', field_of_study: '', institution: '', start_date: '', end_date: '', gpa: '' }])}
                className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Degree
              </button>
            </div>

            {educations.map((edu, eduIdx) => (
              <div key={eduIdx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] grid grid-cols-2 gap-2.5 relative">
                <button
                  type="button"
                  onClick={() => setEducations(educations.filter((_, i) => i !== eduIdx))}
                  className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  placeholder="Degree (e.g. B.S.)"
                  value={edu.degree}
                  onChange={e => {
                    const updated = [...educations];
                    updated[eduIdx].degree = e.target.value;
                    setEducations(updated);
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <input
                  type="text"
                  placeholder="Field of Study (e.g. Computer Science)"
                  value={edu.field_of_study}
                  onChange={e => {
                    const updated = [...educations];
                    updated[eduIdx].field_of_study = e.target.value;
                    setEducations(updated);
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <input
                  type="text"
                  placeholder="Institution"
                  value={edu.institution}
                  onChange={e => {
                    const updated = [...educations];
                    updated[eduIdx].institution = e.target.value;
                    setEducations(updated);
                  }}
                  className="col-span-2 px-3 py-2 rounded-xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live ATS Resume Preview */}
        <div className="sticky top-6 bg-white p-8 sm:p-10 rounded-3xl border border-[#ECE5F6] shadow-saas text-slate-800 font-sans min-h-[700px]">
          <div className="text-center pb-4 border-b border-purple-100">
            <h2 className="text-2xl font-bold font-heading text-[#1E1B2E] tracking-tight">
              {fullName || 'Candidate Name'}
            </h2>
            <div className="text-xs text-[#706886] mt-1.5 flex flex-wrap items-center justify-center gap-2">
              {email && <span>{email}</span>}
              {phone && <span>• {phone}</span>}
              {location && <span>• {location}</span>}
              {linkedin && (
                <span>• <a href={formatUrl(linkedin)} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline font-semibold inline-flex items-center gap-0.5">LinkedIn</a></span>
              )}
              {github && (
                <span>• <a href={formatUrl(github)} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline font-semibold inline-flex items-center gap-0.5">GitHub</a></span>
              )}
            </div>
          </div>

          {/* Preview Summary */}
          {summary && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-purple-100 pb-1 mb-1.5">
                Professional Summary
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* Preview Skills */}
          {skills.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-purple-100 pb-1 mb-1.5">
                Technical Skills
              </h4>
              <p className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Core Technologies:</span> {skills.join(', ')}
              </p>
            </div>
          )}

          {/* Preview Experience */}
          {experiences.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-purple-100 pb-1 mb-2">
                Work Experience
              </h4>
              <div className="space-y-3">
                {experiences.map((exp, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-baseline text-xs font-semibold text-slate-900">
                      <span>{exp.role_title} • {exp.company}</span>
                      <span className="text-[11px] text-slate-500">{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</span>
                    </div>
                    <ul className="mt-1 space-y-1 text-xs text-slate-700 list-disc list-inside">
                      {exp.bullets.map((b, bIdx) => (
                        b.trim() && <li key={bIdx} className="leading-relaxed">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Projects (NEW!) */}
          {projects.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-purple-100 pb-1 mb-2">
                Projects
              </h4>
              <div className="space-y-3">
                {projects.map((proj, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-baseline text-xs font-semibold text-slate-900 flex-wrap gap-1">
                      <span>
                        {proj.title}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <span className="font-normal text-slate-500 italic ml-1">
                            | {proj.technologies.join(', ')}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        {proj.repo_url && (
                          <a href={formatUrl(proj.repo_url)} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline font-semibold">
                            [GitHub]
                          </a>
                        )}
                        {proj.live_url && (
                          <a href={formatUrl(proj.live_url)} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline font-semibold">
                            [Live Demo]
                          </a>
                        )}
                      </div>
                    </div>
                    {proj.bullets && proj.bullets.length > 0 ? (
                      <ul className="mt-1 space-y-1 text-xs text-slate-700 list-disc list-inside">
                        {proj.bullets.map((b, bIdx) => (
                          b.trim() && <li key={bIdx} className="leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    ) : proj.description ? (
                      <p className="mt-1 text-xs text-slate-700 leading-relaxed">{proj.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Education */}
          {educations.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-purple-100 pb-1 mb-2">
                Education
              </h4>
              {educations.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{edu.degree} in {edu.field_of_study}</span>
                    <span className="text-slate-500 block">{edu.institution}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{edu.start_date} - {edu.end_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

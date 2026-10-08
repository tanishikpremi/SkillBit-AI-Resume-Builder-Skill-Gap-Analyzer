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
  Eye, 
  Check, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  FolderGit2 
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
      description: 'Distributed pub/sub messaging engine processing 100k events/sec with fault tolerance.'
    }
  ]);

  // STAR Bullet Suggestion modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetBulletIndex, setTargetBulletIndex] = useState({ expIndex: 0, bulletIndex: 0 });
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
    setActiveResumeId(resObj.id);
    setTitle(resObj.title);
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
    
    if (data.experiences) setExperiences(data.experiences);
    if (data.educations) setEducations(data.educations);
    if (data.projects) setProjects(data.projects);
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

  const handleTriggerStarAI = async (expIndex, bulletIndex, bulletText) => {
    setSuggesting(true);
    setTargetBulletIndex({ expIndex, bulletIndex });
    try {
      const res = await api.post('/resume/suggest-bullets', {
        raw_bullet: bulletText,
        target_skill: skills[0] || 'Python'
      });
      setModalData({
        original: res.data.original_bullet,
        suggested: res.data.suggested_bullet,
        changes: res.data.changes_explained
      });
      setModalOpen(true);
    } catch (err) {
      alert("Could not generate STAR suggestion.");
    } finally {
      setSuggesting(false);
    }
  };

  const handleApplyStarBullet = (improvedText) => {
    const updated = [...experiences];
    updated[targetBulletIndex.expIndex].bullets[targetBulletIndex.bulletIndex] = improvedText;
    setExperiences(updated);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Header & Actions */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            ATS-Compliant Resume Builder
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Single-column machine-parsable architecture with built-in STAR bullet optimizer.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
              <Check className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={handleSaveResume}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            Export ATS PDF
          </button>
        </div>
      </div>

      {/* Main Split Layout: Editor (Left) & Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Form Editor */}
        <div className="space-y-6">
          {/* Resume Name */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Resume Document Name
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Contact Details */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Contact Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Location (City, State)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <input
                type="text"
                placeholder="LinkedIn URL"
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <input
                type="text"
                placeholder="GitHub URL"
                value={github}
                onChange={e => setGithub(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Professional Summary</h3>
            <textarea
              rows={3}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Concise overview of your technical background, domain focus, and impact..."
              className="w-full p-3 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Technical Skills */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Core Technical Skills</h3>
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
                className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (skillInput.trim() && !skills.includes(skillInput.trim())) {
                    setSkills([...skills, skillInput.trim()]);
                    setSkillInput('');
                  }
                }}
                className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, idx) => (
                <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs">
                  {s}
                  <button onClick={() => setSkills(skills.filter((_, i) => i !== idx))} className="text-blue-400 hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Work Experience */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Work Experience</h3>
              <button
                type="button"
                onClick={() => setExperiences([...experiences, { company: '', role_title: '', location: '', start_date: '', end_date: '', is_current: false, bullets: [''] }])}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Position
              </button>
            </div>

            {experiences.map((exp, expIdx) => (
              <div key={expIdx} className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Role Title"
                    value={exp.role_title}
                    onChange={e => {
                      const updated = [...experiences];
                      updated[expIdx].role_title = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white"
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
                    className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-gray-400">Accomplishment Bullets:</span>
                  {exp.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-1.5">
                      <textarea
                        rows={2}
                        value={bullet}
                        onChange={e => {
                          const updated = [...experiences];
                          updated[expIdx].bullets[bIdx] = e.target.value;
                          setExperiences(updated);
                        }}
                        className="flex-1 p-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        title="Optimize bullet with STAR method AI"
                        onClick={() => handleTriggerStarAI(expIdx, bIdx, bullet)}
                        className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
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
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    + Add bullet line
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live ATS Resume Preview */}
        <div className="sticky top-20 glass-panel p-8 rounded-2xl border border-gray-800 shadow-2xl bg-white text-gray-900 font-sans min-h-[700px]">
          <div className="text-center pb-4 border-b border-gray-300">
            <h2 className="text-2xl font-bold font-heading text-gray-900 tracking-tight">
              {fullName || 'Alex Mercer'}
            </h2>
            <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center justify-center gap-2">
              {email && <span>{email}</span>}
              {phone && <span>• {phone}</span>}
              {location && <span>• {location}</span>}
              {linkedin && <span>• {linkedin}</span>}
              {github && <span>• {github}</span>}
            </div>
          </div>

          {/* Preview Summary */}
          {summary && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-1.5">
                Professional Summary
              </h4>
              <p className="text-xs text-gray-800 leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* Preview Skills */}
          {skills.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-1.5">
                Technical Skills
              </h4>
              <p className="text-xs text-gray-800">
                <span className="font-semibold">Core Technologies:</span> {skills.join(', ')}
              </p>
            </div>
          )}

          {/* Preview Experience */}
          {experiences.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-2">
                Work Experience
              </h4>
              <div className="space-y-3">
                {experiences.map((exp, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-baseline text-xs font-semibold text-gray-900">
                      <span>{exp.role_title} • {exp.company}</span>
                      <span className="text-[11px] text-gray-600">{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</span>
                    </div>
                    <ul className="mt-1 space-y-1 text-xs text-gray-800 list-disc list-inside">
                      {exp.bullets.map((b, bIdx) => (
                        b.trim() && <li key={bIdx} className="leading-relaxed">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Education */}
          {educations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-2">
                Education
              </h4>
              {educations.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-semibold text-gray-900">{edu.degree} in {edu.field_of_study}</span>
                    <span className="text-gray-600 block">{edu.institution}</span>
                  </div>
                  <span className="text-[11px] text-gray-600">{edu.start_date} - {edu.end_date}</span>
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

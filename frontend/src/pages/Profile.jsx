import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  FolderGit2, 
  Wrench, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [canonicalSkills, setCanonicalSkills] = useState([]);

  // Form states for basic info
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // Experience modal/inline form
  const [newExp, setNewExp] = useState({ company: '', role_title: '', location: '', start_date: '', end_date: '', is_current: false, bullets: [''] });
  const [showExpModal, setShowExpModal] = useState(false);

  // Education modal
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });
  const [showEduModal, setShowEduModal] = useState(false);

  // Project modal
  const [newProj, setNewProj] = useState({ title: '', description: '', role: '', technologies: '' });
  const [showProjModal, setShowProjModal] = useState(false);

  // Skill add state
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState('Intermediate');

  useEffect(() => {
    fetchProfileData();
    fetchCanonicalSkills();
  }, []);

  const fetchProfileData = async () => {
    try {
      const res = await api.get('/profile');
      setProfile(res.data);
      setHeadline(res.data.headline || '');
      setSummary(res.data.summary || '');
      setPhone(res.data.phone || '');
      setLocation(res.data.location || '');
      setLinkedinUrl(res.data.linkedin_url || '');
      setGithubUrl(res.data.github_url || '');
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCanonicalSkills = async () => {
    try {
      const res = await api.get('/skills?limit=300');
      setCanonicalSkills(res.data);
    } catch (err) {
      console.error("Failed to fetch skills:", err);
    }
  };

  const handleSaveBasicInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.put('/profile', {
        headline,
        summary,
        phone,
        location,
        linkedin_url: linkedinUrl,
        github_url: githubUrl
      });
      setMsg('Profile successfully updated!');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg('Error saving profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newExp,
        bullets: newExp.bullets.filter(b => b.trim().length > 0)
      };
      await api.post('/profile/experience', payload);
      setShowExpModal(false);
      setNewExp({ company: '', role_title: '', location: '', start_date: '', end_date: '', is_current: false, bullets: [''] });
      fetchProfileData();
    } catch (err) {
      alert("Failed to add experience.");
    }
  };

  const handleDeleteExperience = async (id) => {
    if (!window.confirm("Remove this experience entry?")) return;
    try {
      await api.delete(`/profile/experience/${id}`);
      fetchProfileData();
    } catch (err) {
      alert("Failed to delete experience.");
    }
  };

  const handleAddEducation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/profile/education', newEdu);
      setShowEduModal(false);
      setNewEdu({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });
      fetchProfileData();
    } catch (err) {
      alert("Failed to add education.");
    }
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm("Remove this education entry?")) return;
    try {
      await api.delete(`/profile/education/${id}`);
      fetchProfileData();
    } catch (err) {
      alert("Failed to delete education.");
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newProj,
        technologies: newProj.technologies.split(',').map(t => t.trim()).filter(Boolean)
      };
      await api.post('/profile/project', payload);
      setShowProjModal(false);
      setNewProj({ title: '', description: '', role: '', technologies: '' });
      fetchProfileData();
    } catch (err) {
      alert("Failed to add project.");
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Remove this project entry?")) return;
    try {
      await api.delete(`/profile/project/${id}`);
      fetchProfileData();
    } catch (err) {
      alert("Failed to delete project.");
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!selectedSkillId) return;
    try {
      await api.post('/profile/skill', {
        skill_id: selectedSkillId,
        proficiency
      });
      setSelectedSkillId('');
      fetchProfileData();
    } catch (err) {
      alert("Failed to add skill.");
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await api.delete(`/profile/skill/${id}`);
      fetchProfileData();
    } catch (err) {
      alert("Failed to delete skill.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
            Professional Profile
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Maintain your master career profile to automatically power resumes and match evaluations.
          </p>
        </div>
        {msg && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <Check className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}
      </div>

      {/* Basic Info Form */}
      <form onSubmit={handleSaveBasicInfo} className="glass-panel p-6 sm:p-7 rounded-2xl border border-gray-800 space-y-4">
        <h3 className="font-heading font-bold text-base text-white flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-blue-400" />
          Primary Career Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA or Remote"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
            Professional Summary
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="High-level summary of your background, architectural focus, and engineering achievements..."
            className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              LinkedIn Profile URL
            </label>
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="linkedin.com/in/username"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              GitHub Profile URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="github.com/username"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Basic Info'}
          </button>
        </div>
      </form>

      {/* Experience Section */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            Work Experience
          </h3>
          <button
            onClick={() => setShowExpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Experience
          </button>
        </div>

        {profile?.experiences?.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No work experience entries recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {profile?.experiences?.map((exp) => (
              <div key={exp.id} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-white">{exp.role_title} • <span className="text-gray-400">{exp.company}</span></h4>
                  <p className="text-xs text-gray-400 mt-0.5">{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date} {exp.location && `| ${exp.location}`}</p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-300">
                    {exp.bullets?.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-400">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handleDeleteExperience(exp.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills Section */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-gray-800">
        <h3 className="font-heading font-bold text-base text-white flex items-center gap-2 mb-4">
          <Wrench className="w-4 h-4 text-purple-400" />
          Technical Skills & Proficiencies
        </h3>

        <form onSubmit={handleAddSkill} className="flex flex-wrap items-center gap-3 mb-5 p-3.5 rounded-xl bg-gray-900/80 border border-gray-800">
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none"
            >
              <option value="">-- Select Canonical Skill to Add --</option>
              {canonicalSkills.map(s => (
                <option key={s.id} value={s.id}>{s.canonical_name} ({s.category})</option>
              ))}
            </select>
          </div>

          <select
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Skill
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {profile?.user_skills?.map((us) => (
            <div
              key={us.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700 text-xs text-gray-200"
            >
              <span className="font-medium">{us.skill_name}</span>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                {us.proficiency}
              </span>
              <button
                onClick={() => handleDeleteSkill(us.id)}
                className="text-gray-500 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Experience Add Modal */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-gray-700 space-y-4">
            <h3 className="font-heading font-bold text-base text-white">Add Work Experience</h3>
            <form onSubmit={handleAddExperience} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Company Name (e.g. Acme Cloud)"
                value={newExp.company}
                onChange={e => setNewExp({...newExp, company: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <input
                type="text"
                required
                placeholder="Role Title (e.g. Senior Python Developer)"
                value={newExp.role_title}
                onChange={e => setNewExp({...newExp, role_title: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Start Date (e.g. 2021)"
                  value={newExp.start_date}
                  onChange={e => setNewExp({...newExp, start_date: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="End Date (or 'Present')"
                  value={newExp.end_date}
                  onChange={e => setNewExp({...newExp, end_date: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Accomplishment bullet points (one per line)..."
                value={newExp.bullets.join('\n')}
                onChange={e => setNewExp({...newExp, bullets: e.target.value.split('\n')})}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

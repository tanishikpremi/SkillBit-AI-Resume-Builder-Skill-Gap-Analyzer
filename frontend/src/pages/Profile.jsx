import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Code2,
  Upload,
  FileText,
  UserCheck,
  UserPlus,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [savedResumes, setSavedResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [canonicalSkills, setCanonicalSkills] = useState([]);

  // Resume Upload -> Auto-Extract Profile State
  const [resumeFile, setResumeFile] = useState(null);
  const [extractingResume, setExtractingResume] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [newProfileTitle, setNewProfileTitle] = useState('');
  const [savingExtractedProfile, setSavingExtractedProfile] = useState(false);

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

  // Education modal/form
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });
  const [showEduModal, setShowEduModal] = useState(false);

  // Project modal/form
  const [newProj, setNewProj] = useState({ title: '', description: '', technologies: '', repo_url: '', live_url: '' });
  const [showProjModal, setShowProjModal] = useState(false);

  // Skill add state
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState('Intermediate');

  useEffect(() => {
    fetchProfileData();
    fetchSavedResumes();
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

  const fetchSavedResumes = async () => {
    try {
      const res = await api.get('/resume');
      setSavedResumes(res.data || []);
    } catch (err) {
      console.error("Failed to load saved profiles/resumes:", err);
    }
  };

  const fetchCanonicalSkills = async () => {
    try {
      const res = await api.get('/skills?limit=150');
      setCanonicalSkills(res.data);
    } catch (err) {
      console.error("Failed to load skills taxonomy:", err);
    }
  };

  const handleExtractFromResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      setUploadError('Please select a PDF, DOCX, or TXT resume file first.');
      return;
    }

    setExtractingResume(true);
    setUploadError('');
    setUploadResult(null);
    setMsg('');

    const formData = new FormData();
    formData.append('file', resumeFile);

    try {
      const res = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setUploadResult(data);
      const gen = data.generated_profile || {};
      const defaultTitle = gen.full_name && gen.headline
        ? `${gen.full_name} — ${gen.headline}`
        : (data.title || 'Extracted Candidate Profile');
      setNewProfileTitle(defaultTitle);
      await fetchSavedResumes();
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to extract profile from resume.');
    } finally {
      setExtractingResume(false);
    }
  };

  const handleConfirmSaveNewProfile = async (goToJobMatch = false) => {
    if (!uploadResult) return;
    setSavingExtractedProfile(true);
    setUploadError('');
    try {
      const chosenTitle = newProfileTitle.trim() || uploadResult.title || 'Candidate Profile';
      await api.post('/profile/sync-from-resume', null, {
        params: {
          resume_id: uploadResult.id,
          replace: true,
          profile_title: chosenTitle
        }
      });
      await fetchProfileData();
      await fetchSavedResumes();
      const targetResumeId = uploadResult.id;
      setUploadResult(null);
      setResumeFile(null);
      setMsg(`Profile "${chosenTitle}" automatically generated and saved!`);
      setTimeout(() => setMsg(''), 4500);
      if (goToJobMatch) {
        navigate(`/match?resumeId=${targetResumeId}`);
      }
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to save generated profile.');
    } finally {
      setSavingExtractedProfile(false);
    }
  };

  const handleUseExistingProfileForJobMatch = async () => {
    if (!uploadResult) return;
    const targetId = uploadResult.existing_resume_id || uploadResult.id;
    if (uploadResult.is_exact_profile_match && uploadResult.existing_resume_id && uploadResult.existing_resume_id !== uploadResult.id) {
      try {
        await api.delete(`/resume/${uploadResult.id}`);
      } catch {
        // Ignore cleanup error
      }
    }
    navigate(`/match?resumeId=${targetId}`);
  };

  const handleDiscardExtractedPrompt = async () => {
    setUploadResult(null);
    setResumeFile(null);
    setMsg('Kept your existing profile without overwriting.');
    setTimeout(() => setMsg(''), 3500);
  };

  const handleActivateSavedProfile = async (resObj) => {
    setSyncing(true);
    setMsg('');
    try {
      await api.post('/profile/sync-from-resume', null, {
        params: {
          resume_id: resObj.id,
          replace: true
        }
      });
      await fetchProfileData();
      setMsg(`Switched active profile to "${resObj.title}"!`);
      setTimeout(() => setMsg(''), 3500);
    } catch (err) {
      alert(err.response?.data?.detail || "Could not load selected profile.");
    } finally {
      setSyncing(false);
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
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      await api.post('/profile/experience', newExp);
      setShowExpModal(false);
      setNewExp({ company: '', role_title: '', location: '', start_date: '', end_date: '', is_current: false, bullets: [''] });
      fetchProfileData();
    } catch (err) {
      alert("Failed to add experience entry.");
    }
  };

  const handleDeleteExperience = async (id) => {
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
      alert("Failed to add education entry.");
    }
  };

  const handleDeleteEducation = async (id) => {
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
        title: newProj.title,
        description: newProj.description,
        technologies: newProj.technologies ? newProj.technologies.split(',').map(s => s.trim()).filter(Boolean) : [],
        repo_url: newProj.repo_url,
        live_url: newProj.live_url
      };
      await api.post('/profile/project', payload);
      setShowProjModal(false);
      setNewProj({ title: '', description: '', technologies: '', repo_url: '', live_url: '' });
      fetchProfileData();
    } catch (err) {
      alert("Failed to add project entry.");
    }
  };

  const handleDeleteProject = async (id) => {
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
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const genProfile = uploadResult?.generated_profile || {};

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-fadeIn pb-16">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            AI Profile Extractor & Career Record
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1E1B2E]">
            Extract & Manage Candidate Profile
          </h1>
          <p className="text-xs text-[#706886] mt-0.5">
            Upload a resume to automatically generate your profile, detect existing matches, or customize your career record for Job Match.
          </p>
        </div>

        {savedResumes.length > 0 && (
          <button
            onClick={() => navigate(`/match?resumeId=${savedResumes[0].id}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
          >
            <Briefcase className="w-4 h-4" />
            <span>Use Current Profile for Job Match</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {msg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-lime-50 border border-lime-200 text-lime-800 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-lime-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* 1. Extract Profile from Resume Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-extrabold text-base sm:text-lg text-[#1E1B2E] flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              Extract Profile from Resume
            </h2>
            <p className="text-xs text-[#706886] mt-0.5">
              Upload your PDF, DOCX, or TXT resume. Your profile will be automatically generated, and we will check if an identical profile already exists.
            </p>
          </div>
        </div>

        {!uploadResult ? (
          <form onSubmit={handleExtractFromResumeUpload} className="space-y-4">
            <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/40 rounded-2xl p-6 text-center transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <label className="cursor-pointer">
                    <span className="font-bold text-xs sm:text-sm text-purple-700 hover:underline">
                      Choose a Resume File (.PDF, .DOCX, .TXT)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setResumeFile(e.target.files[0]);
                          setUploadError('');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-[#706886] mt-0.5">
                    {resumeFile
                      ? `Selected: ${resumeFile.name} (${(resumeFile.size / 1024).toFixed(1)} KB)`
                      : 'Automatically extracts contact info, summary, experience, projects, education, and skills.'}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!resumeFile || extractingResume}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{extractingResume ? 'Extracting Profile...' : 'Extract Profile from Resume'}</span>
              </button>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </form>
        ) : (
          /* Decision Prompt After Automatic Profile Generation */
          <div className="space-y-4 animate-fadeIn">
            {uploadResult.is_exact_profile_match ? (
              /* Exact Existing Profile Found — Ask Whether to Make a New Profile or Use Existing for Job Match */
              <div className="bg-amber-50/90 p-5 sm:p-6 rounded-2xl border-2 border-amber-300 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 mb-1">
                      Exact Existing Profile Match (No Changes Found)
                    </span>
                    <h3 className="font-heading font-extrabold text-base text-[#1E1B2E]">
                      This Resume Matches Your Existing Profile ("{uploadResult.existing_profile_title}")
                    </h3>
                    <p className="text-xs text-[#4B4462] mt-1 leading-relaxed">
                      We found no changes in your contact details, summary, work experience, education, projects, or extracted skills compared to your existing profile.
                      Would you like to <span className="font-bold">use your existing profile for Job Match</span> or <span className="font-bold">make a new profile</span>?
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                      Profile Title (If making a new profile)
                    </label>
                    <input
                      type="text"
                      value={newProfileTitle}
                      onChange={(e) => setNewProfileTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleUseExistingProfileForJobMatch}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Use Existing Profile for Job Match</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={savingExtractedProfile}
                      onClick={() => handleConfirmSaveNewProfile(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4 text-purple-600" />
                      <span>{savingExtractedProfile ? 'Saving...' : 'Make a New Profile'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDiscardExtractedPrompt}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#706886] hover:text-[#1E1B2E]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* New or Updated Profile Information — Ask Whether to Save as New Profile */
              <div className="bg-purple-50/70 p-5 sm:p-6 rounded-2xl border-2 border-purple-300 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-200/80 text-purple-900 mb-1">
                      Profile Automatically Generated from Resume
                    </span>
                    <h3 className="font-heading font-extrabold text-base text-[#1E1B2E]">
                      Save This Extracted Profile as a New Profile?
                    </h3>
                    <p className="text-xs text-[#4B4462] mt-0.5 leading-relaxed">
                      We extracted <span className="font-bold">{genProfile.experiences?.length || 0} work experience(s)</span>,{' '}
                      <span className="font-bold">{genProfile.educations?.length || 0} education entry(s)</span>,{' '}
                      <span className="font-bold">{genProfile.projects?.length || 0} project(s)</span>, and{' '}
                      <span className="font-bold">{uploadResult.extracted_skills?.length || 0} canonical skills</span>.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#ECE5F6] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#9D93B4] block">Extracted Name & Headline</span>
                      <span className="font-bold text-[#1E1B2E]">
                        {genProfile.full_name || 'Candidate'} — <span className="text-purple-700">{genProfile.headline || 'Professional'}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#9D93B4] block">Extracted Contact</span>
                      <span className="text-[#4B4462]">
                        {[genProfile.email, genProfile.phone, genProfile.location].filter(Boolean).join(' • ') || 'Detected from header'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                      Save Profile As
                    </label>
                    <input
                      type="text"
                      value={newProfileTitle}
                      onChange={(e) => setNewProfileTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={savingExtractedProfile}
                      onClick={() => handleConfirmSaveNewProfile(false)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{savingExtractedProfile ? 'Saving...' : 'Yes, Save as New Profile'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={savingExtractedProfile}
                      onClick={() => handleConfirmSaveNewProfile(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      <span>Save as New Profile & Go to Job Match</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDiscardExtractedPrompt}
                      className="px-4 py-2.5 rounded-2xl bg-[#FAF8FD] hover:bg-slate-100 text-[#524B68] border border-[#ECE5F6] text-xs font-semibold transition-all"
                    >
                      No, Keep Current Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Saved Profiles Library (Quick Switcher & Job Match Launcher) */}
      {savedResumes.length > 0 && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                Saved Candidate Profiles ({savedResumes.length})
              </h3>
              <p className="text-xs text-[#706886]">
                Select any saved profile to load its details below or use it directly for Job Match.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedResumes.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] hover:border-purple-300 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-[#1E1B2E] truncate">{r.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                      ATS {r.ats_score || 85}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#706886] truncate mt-0.5">
                    {r.structured_json?.headline || r.structured_json?.summary || 'Structured Candidate Profile'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={() => handleActivateSavedProfile(r)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold transition-colors"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/match?resumeId=${r.id}`)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
                  >
                    <span>Job Match</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Basic Info Form */}
      <form onSubmit={handleSaveBasicInfo} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-4">
        <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-purple-600" />
          Active Profile — Primary Career Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA or Remote"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
            Professional Summary
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="High-level summary of your background, architectural focus, and engineering achievements..."
            className="w-full p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              LinkedIn Profile URL
            </label>
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              GitHub Profile URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Primary Info'}
          </button>
        </div>
      </form>

      {/* Experience Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-600" />
            Work Experience ({profile?.experiences?.length || 0})
          </h3>
          <button
            onClick={() => setShowExpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Experience
          </button>
        </div>

        {profile?.experiences?.length === 0 ? (
          <p className="text-xs text-[#706886] italic py-2">No work experience entries recorded yet. Upload a resume above to extract automatically.</p>
        ) : (
          <div className="space-y-3">
            {profile?.experiences?.map((exp) => (
              <div key={exp.id} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#1E1B2E]">{exp.role_title} • <span className="text-purple-700 font-medium">{exp.company}</span></h4>
                  <p className="text-xs text-[#706886] mt-0.5">{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date} {exp.location && `| ${exp.location}`}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#332D47]">
                    {exp.bullets?.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-purple-600">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handleDeleteExperience(exp.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-purple-600" />
            Projects & Portfolio Highlights ({profile?.projects?.length || 0})
          </h3>
          <button
            onClick={() => setShowProjModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Project
          </button>
        </div>

        {profile?.projects?.length === 0 ? (
          <p className="text-xs text-[#706886] italic py-2">No projects recorded yet. Upload a resume above or add your key technical demonstrations.</p>
        ) : (
          <div className="space-y-3">
            {profile?.projects?.map((proj) => (
              <div key={proj.id} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#1E1B2E]">{proj.title}</h4>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                      {proj.technologies.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {proj.description && (
                    <p className="text-xs text-[#4B4462] leading-relaxed mt-1">{proj.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    {proj.repo_url && (
                      <a href={proj.repo_url} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline flex items-center gap-1 font-semibold">
                        <Code2 className="w-3 h-3" /> Repository
                      </a>
                    )}
                    {proj.live_url && (
                      <a href={proj.live_url} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline flex items-center gap-1 font-semibold">
                        <ExternalLink className="w-3 h-3" /> Live Demo
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteProject(proj.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Education Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-600" />
            Education & Academic Qualifications ({profile?.educations?.length || 0})
          </h3>
          <button
            onClick={() => setShowEduModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Education
          </button>
        </div>

        {profile?.educations?.length === 0 ? (
          <p className="text-xs text-[#706886] italic py-2">No education records recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {profile?.educations?.map((edu) => (
              <div key={edu.id} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[#1E1B2E]">
                    {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`} • <span className="text-purple-700 font-medium">{edu.institution}</span>
                  </h4>
                  <p className="text-xs text-[#706886] mt-0.5">
                    {edu.start_date} - {edu.end_date} {edu.gpa && `| GPA: ${edu.gpa}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteEducation(edu.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Technical Skills Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas">
        <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2 mb-4">
          <Wrench className="w-4 h-4 text-purple-600" />
          Technical Skills & Proficiencies ({profile?.user_skills?.length || 0})
        </h3>

        <form onSubmit={handleAddSkill} className="flex flex-wrap items-center gap-3 mb-5 p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6]">
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500"
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
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Skill
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {profile?.user_skills?.map((us) => (
            <div
              key={us.id}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-900 font-medium"
            >
              <span className="font-semibold">{us.skill_name}</span>
              <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-mono">
                {us.proficiency}
              </span>
              <button
                onClick={() => handleDeleteSkill(us.id)}
                className="text-purple-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Experience Add Modal */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 sm:p-7 rounded-3xl border border-[#ECE5F6] shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E]">Add Work Experience</h3>
            <form onSubmit={handleAddExperience} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Company Name (e.g. Acme Cloud)"
                value={newExp.company}
                onChange={e => setNewExp({...newExp, company: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
              />
              <input
                type="text"
                required
                placeholder="Role Title (e.g. Senior Python Developer)"
                value={newExp.role_title}
                onChange={e => setNewExp({...newExp, role_title: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Start Date (e.g. 2021)"
                  value={newExp.start_date}
                  onChange={e => setNewExp({...newExp, start_date: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <input
                  type="text"
                  placeholder="End Date (or 'Present')"
                  value={newExp.end_date}
                  onChange={e => setNewExp({...newExp, end_date: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Accomplishment bullet points (one per line)..."
                value={newExp.bullets.join('\n')}
                onChange={e => setNewExp({...newExp, bullets: e.target.value.split('\n')})}
                className="w-full p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="px-4 py-2 rounded-2xl bg-[#FAF8FD] text-xs text-[#5C5572] hover:bg-purple-50 border border-[#ECE5F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white shadow-sm"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Education Add Modal */}
      {showEduModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 sm:p-7 rounded-3xl border border-[#ECE5F6] shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E]">Add Education Record</h3>
            <form onSubmit={handleAddEducation} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Institution / University Name"
                value={newEdu.institution}
                onChange={e => setNewEdu({...newEdu, institution: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Degree (e.g. B.S., M.S.)"
                  value={newEdu.degree}
                  onChange={e => setNewEdu({...newEdu, degree: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <input
                  type="text"
                  placeholder="Field of Study (e.g. Computer Science)"
                  value={newEdu.field_of_study}
                  onChange={e => setNewEdu({...newEdu, field_of_study: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Start Year (2018)"
                  value={newEdu.start_date}
                  onChange={e => setNewEdu({...newEdu, start_date: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <input
                  type="text"
                  placeholder="End Year (2022)"
                  value={newEdu.end_date}
                  onChange={e => setNewEdu({...newEdu, end_date: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <input
                  type="text"
                  placeholder="GPA (e.g. 3.8)"
                  value={newEdu.gpa}
                  onChange={e => setNewEdu({...newEdu, gpa: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEduModal(false)}
                  className="px-4 py-2 rounded-2xl bg-[#FAF8FD] text-xs text-[#5C5572] hover:bg-purple-50 border border-[#ECE5F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white shadow-sm"
                >
                  Save Education
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Add Modal */}
      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 sm:p-7 rounded-3xl border border-[#ECE5F6] shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E]">Add Project Highlight</h3>
            <form onSubmit={handleAddProject} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Project Title (e.g. Real-Time Analytics Pipeline)"
                value={newProj.title}
                onChange={e => setNewProj({...newProj, title: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
              />
              <input
                type="text"
                placeholder="Technologies (comma separated, e.g. Python, Docker, Redis)"
                value={newProj.technologies}
                onChange={e => setNewProj({...newProj, technologies: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="GitHub Repo URL"
                  value={newProj.repo_url}
                  onChange={e => setNewProj({...newProj, repo_url: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
                <input
                  type="text"
                  placeholder="Live Demo URL"
                  value={newProj.live_url}
                  onChange={e => setNewProj({...newProj, live_url: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Project description, architecture, and impact..."
                value={newProj.description}
                onChange={e => setNewProj({...newProj, description: e.target.value})}
                className="w-full p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E]"
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjModal(false)}
                  className="px-4 py-2 rounded-2xl bg-[#FAF8FD] text-xs text-[#5C5572] hover:bg-purple-50 border border-[#ECE5F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white shadow-sm"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

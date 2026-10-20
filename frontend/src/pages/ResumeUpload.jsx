import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  FileCheck,
  UserCheck,
  UserPlus,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Check
} from 'lucide-react';

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Profile generation & decision states
  const [profileTitleInput, setProfileTitleInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileDecisionDone, setProfileDecisionDone] = useState(false);
  const [profileStatusBanner, setProfileStatusBanner] = useState('');

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setProfileDecisionDone(false);
    setProfileStatusBanner('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setResult(data);
      const gen = data.generated_profile || {};
      const defaultProfileName = gen.full_name && gen.headline
        ? `${gen.full_name} — ${gen.headline}`
        : (data.title || 'Candidate Profile');
      setProfileTitleInput(defaultProfileName);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse resume document.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAsNewProfile = async (goToMatch = false) => {
    if (!result) return;
    setSavingProfile(true);
    try {
      const chosenTitle = profileTitleInput.trim() || result.title || 'Candidate Profile';
      await api.post('/profile/sync-from-resume', null, {
        params: {
          resume_id: result.id,
          replace: true,
          profile_title: chosenTitle
        }
      });
      setProfileDecisionDone(true);
      setProfileStatusBanner(`Saved "${chosenTitle}" as your active Candidate Profile!`);
      if (goToMatch) {
        navigate(`/match?resumeId=${result.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save generated profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUseExistingProfileForMatch = async () => {
    if (!result) return;
    const targetId = result.existing_resume_id || result.id;
    // If upload created a duplicate resume entry identical to an existing one, clean up the duplicate
    if (result.is_exact_profile_match && result.existing_resume_id && result.existing_resume_id !== result.id) {
      try {
        await api.delete(`/resume/${result.id}`);
      } catch {
        // Ignore cleanup error
      }
    }
    navigate(`/match?resumeId=${targetId}`);
  };

  const handleSkipSavingProfile = () => {
    setProfileDecisionDone(true);
    setProfileStatusBanner('Kept your existing Master Profile unchanged. You can still use this resume below.');
  };

  const genProfile = result?.generated_profile || {};

  return (
    <div className="max-w-4xl mx-auto space-y-7 animate-fadeIn pb-16">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          Layout-Aware Resume Ingestion & Auto-Profile Generator
        </div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1E1B2E]">
          Upload Resume & Generate Profile
        </h1>
        <p className="text-xs text-[#706886] mt-1">
          Upload your PDF, DOCX, or TXT resume to automatically extract sections, generate your candidate profile, and evaluate job fit.
        </p>
      </div>

      {/* Upload Zone */}
      {!result ? (
        <form onSubmit={handleUpload} className="bg-white p-7 sm:p-9 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-6">
          <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/50 rounded-3xl p-8 sm:p-12 text-center transition-all">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4 border border-purple-200 shadow-sm">
              <Upload className="w-6 h-6" />
            </div>

            <label className="cursor-pointer">
              <span className="font-semibold text-sm text-purple-700 hover:underline">
                Click to browse
              </span>{' '}
              <span className="text-sm text-[#4B4462]">or drag and drop your resume file</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-[#706886] mt-2 font-medium">
              Supported formats: PDF, DOCX, TXT (Maximum file size: 5MB)
            </p>

            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-900 font-semibold shadow-sm">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 hover:shadow-lg transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {uploading ? 'Extracting Resume & Generating Profile...' : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Parse Resume & Generate Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Parsed Results Overview */
        <div className="space-y-6">
          {/* Interactive Auto-Generated Profile Decision Card */}
          {!profileDecisionDone ? (
            result.is_exact_profile_match ? (
              /* CASE 1: Exact Existing Profile Found (No Changes in Information) */
              <div className="bg-amber-50/90 p-6 sm:p-7 rounded-3xl border-2 border-amber-300 shadow-saas space-y-5 animate-fadeIn">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      Exact Existing Profile Match Detected
                    </span>
                    <h3 className="font-heading font-extrabold text-lg text-[#1E1B2E]">
                      No Changes Found in Your Profile Information
                    </h3>
                    <p className="text-xs text-[#4B4462] leading-relaxed">
                      We automatically generated a profile from <span className="font-bold text-[#1E1B2E]">{result.title}</span> and found that it matches your existing profile{' '}
                      <span className="font-bold text-purple-800">"{result.existing_profile_title}"</span> with identical contact details, skills, work experience, projects, and education.
                      Would you like to <span className="font-bold">use your existing profile for Job Match</span> or <span className="font-bold">make a new profile anyway</span>?
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 p-4 rounded-2xl border border-amber-200 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                      New Profile Title (If making a new profile)
                    </label>
                    <input
                      type="text"
                      value={profileTitleInput}
                      onChange={(e) => setProfileTitleInput(e.target.value)}
                      placeholder="e.g. Alex Mercer — Cloud Engineer Profile (Copy)"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleUseExistingProfileForMatch}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Use Existing Profile for Job Match</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => handleSaveAsNewProfile(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4 text-purple-600" />
                      <span>{savingProfile ? 'Creating Profile...' : 'Make a New Profile Anyway'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* CASE 2: New or Updated Profile Information — Ask Whether to Save as New Profile */
              <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 p-6 sm:p-7 rounded-3xl border-2 border-purple-300 shadow-saas space-y-5 animate-fadeIn">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Auto-Generated Candidate Profile
                      </span>
                      <h3 className="font-heading font-extrabold text-lg text-[#1E1B2E] mt-1">
                        Save Extracted Information as a New Profile?
                      </h3>
                      <p className="text-xs text-[#4B4462] mt-0.5 leading-relaxed">
                        We automatically generated a structured profile from your resume. Review the extracted details below and choose whether to save it as a new profile.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-Generated Profile Summary Preview */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#ECE5F6] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D93B4] block">Candidate Name & Headline</span>
                      <p className="text-xs font-bold text-[#1E1B2E] mt-0.5">
                        {genProfile.full_name || 'Candidate'} • <span className="text-purple-700">{genProfile.headline || 'Software Professional'}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D93B4] block">Extracted Contact Details</span>
                      <p className="text-xs text-[#4B4462] mt-0.5">
                        {[genProfile.email, genProfile.phone, genProfile.location].filter(Boolean).join(' • ') || 'Contact extracted from resume'}
                      </p>
                    </div>
                  </div>

                  {genProfile.summary && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D93B4] block">Generated Summary</span>
                      <p className="text-xs text-[#332D47] mt-0.5 line-clamp-2">{genProfile.summary}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                      {genProfile.experiences?.length || 0} Experience(s)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200">
                      <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                      {genProfile.educations?.length || 0} Education(s)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200">
                      <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                      {genProfile.projects?.length || 0} Project(s)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-lime-50 text-lime-800 border border-lime-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-lime-600" />
                      {result.extracted_skills?.length || 0} Normalized Skills
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#ECE5F6]">
                    <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={profileTitleInput}
                      onChange={(e) => setProfileTitleInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Decision Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => handleSaveAsNewProfile(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{savingProfile ? 'Saving Profile...' : 'Save as New Profile & Go to Job Match'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => handleSaveAsNewProfile(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-purple-600" />
                    <span>Save as New Profile Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipSavingProfile}
                    className="px-4 py-2.5 rounded-2xl bg-[#FAF8FD] hover:bg-slate-100 text-[#524B68] border border-[#ECE5F6] text-xs font-semibold transition-all"
                  >
                    Do Not Save as Profile
                  </button>
                </div>
              </div>
            )
          ) : (
            profileStatusBanner && (
              <div className="bg-lime-50 p-4 sm:p-5 rounded-3xl border border-lime-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 text-xs font-bold text-lime-900">
                  <CheckCircle2 className="w-5 h-5 text-lime-600 shrink-0" />
                  <span>{profileStatusBanner}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-lime-100/60 text-lime-900 border border-lime-300 text-xs font-semibold transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/match?resumeId=${result.id}`)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
                  >
                    Run Job Match
                  </button>
                </div>
              </div>
            )
          )}

          {/* Top Action Bar */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-lime-600" />
                <h3 className="font-heading font-extrabold text-lg text-[#1E1B2E]">
                  Resume Successfully Ingested
                </h3>
              </div>
              <p className="text-xs text-[#706886] mt-0.5">
                Extracted from <span className="font-semibold text-[#1E1B2E]">{result.title}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setProfileDecisionDone(false);
                }}
                className="px-3.5 py-2 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 text-xs text-[#4B4462] font-semibold border border-[#ECE5F6] transition-colors"
              >
                Upload Another
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200 transition-colors shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Open Candidate Profile</span>
              </button>
              <button
                onClick={() => navigate(`/match?resumeId=${result.id}`)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all"
              >
                <span>Evaluate Against Target Job</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metrics & Detected Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
              <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">
                ATS Readability Index
              </span>
              <div className="text-3xl font-extrabold font-heading text-lime-700 mt-2">
                {result.ats_score}%
              </div>
              <p className="text-[11px] text-[#706886] mt-1 font-medium">
                Standard single-column parseability and structural completeness.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
              <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">
                Detected Resume Sections
              </span>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {result.detected_sections && Object.entries(result.detected_sections).map(([sec, found]) => (
                  <div key={sec} className="flex items-center gap-2 text-[#332D47] font-medium">
                    <span className={`w-2 h-2 rounded-full ${found ? 'bg-lime-500' : 'bg-slate-300'}`}></span>
                    <span className="capitalize">{sec.replace('_text', '').replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extracted & Normalized Skills */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E]">
              Extracted Skills & Contextual Evidence ({result.extracted_skills?.length || 0})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.extracted_skills?.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#1E1B2E]">{s.canonical_name}</span>
                    <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                      s.evidence_level === 'STRONG' ? 'bg-lime-50 text-lime-800 border border-lime-200' :
                      s.evidence_level === 'MODERATE' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                      'bg-purple-50 text-purple-800 border border-purple-200'
                    }`}>
                      {s.evidence_level} EVIDENCE
                    </span>
                  </div>
                  <span className="text-[10px] text-[#706886] font-medium block mb-1">
                    Found in: {s.sections_found?.join(', ')}
                  </span>
                  {s.evidence_snippets?.[0] && (
                    <p className="text-[11px] text-[#4B4462] italic bg-white p-2 rounded-xl border border-[#ECE5F6]">
                      "{s.evidence_snippets[0]}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

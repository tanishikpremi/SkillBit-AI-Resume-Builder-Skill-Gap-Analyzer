import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Compass,
  Search,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  Building2,
  MapPin,
  FileText,
  EyeOff,
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'Recommended' },
  { id: 'best_match', label: 'Best Matches' },
  { id: 'latest', label: 'Latest' },
  { id: 'internship', label: 'Internships' },
  { id: 'fresher_friendly', label: 'Fresher-Friendly' },
  { id: 'remote', label: 'Remote' },
  { id: 'startup', label: 'Startups' },
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
];

export default function JobFinder() {
  const [recommendations, setRecommendations] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);

  const loadRecommendations = async (tab = activeTab) => {
    setLoading(true);
    try {
      const [recRes, snapRes] = await Promise.all([
        api.get('/discovery/recommendations', {
          params: {
            category_tab: tab,
            role: roleFilter || undefined,
            skill: skillFilter || undefined,
          },
        }),
        api.get('/discovery/candidate-context'),
      ]);
      setRecommendations(recRes.data || []);
      setSnapshot(snapRes.data || null);
    } catch (err) {
      console.error('Failed to load job discovery recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations(activeTab);
  }, [activeTab]);

  const handleRunSearch = async () => {
    setSearching(true);
    try {
      await api.post('/discovery/search', {
        custom_queries: roleFilter ? [roleFilter] : undefined,
        force_refresh_profile: true,
        run_in_background: false,
      });
      await loadRecommendations(activeTab);
    } finally {
      setSearching(false);
    }
  };

  const handleToggleSave = async (rec) => {
    const jobId = rec.job_listing_id;
    if (rec.is_saved) {
      await api.delete(`/discovery/jobs/${jobId}/save`);
    } else {
      await api.post(`/discovery/jobs/${jobId}/save`, {});
    }
    await loadRecommendations(activeTab);
  };

  const handleMarkApplied = async (rec) => {
    await api.post(`/discovery/jobs/${rec.job_listing_id}/apply`, {
      resume_id: rec.best_resume_id || undefined,
      status: 'Applied',
    });
    await loadRecommendations(activeTab);
  };

  const handleDismiss = async (rec) => {
    await api.post(`/discovery/jobs/${rec.job_listing_id}/dismiss`);
    setRecommendations((prev) => prev.filter((x) => x.job_listing_id !== rec.job_listing_id));
  };

  const unified = snapshot?.unified_profile_json || {};

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
            Proactive AI Career Discovery
          </span>
          <h1 className="font-heading font-extrabold text-2xl text-[#1E1B2E] mt-2 flex items-center gap-2">
            <Compass className="w-6 h-6 text-purple-600" />
            AI Job Finder & Opportunity Engine
          </h1>
          <p className="text-xs text-[#706886] mt-1">
            Discovers, verifies, deduplicates and ranks opportunities using your Master Profile and {snapshot?.resume_count_analyzed || 0} saved resume(s).
          </p>
        </div>
        <button
          onClick={handleRunSearch}
          disabled={searching}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${searching ? 'animate-spin' : ''}`} />
          <span>{searching ? 'Discovering Jobs...' : 'Discover Opportunities'}</span>
        </button>
      </div>

      {unified.inferred_roles && (
        <div className="bg-white p-5 rounded-2xl border border-[#ECE5F6] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#1E1B2E]">Target & Adjacent Roles:</span>
            {(unified.inferred_roles || []).concat((unified.adjacent_roles || []).slice(0, 3)).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r);
                  loadRecommendations(activeTab);
                }}
                className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-semibold hover:bg-purple-100"
              >
                {r}
              </button>
            ))}
          </div>
          <span className="text-[#706886]">
            Stage: <b>{unified.career_stage || 'Early Career'}</b>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === t.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-[#524B68] border border-[#ECE5F6] hover:border-purple-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          placeholder="Filter by role title or company..."
          className="px-4 py-2.5 rounded-2xl bg-white border border-[#ECE5F6] text-xs"
        />
        <input
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          placeholder="Filter by skill (e.g. Python, React, SQL)..."
          className="px-4 py-2.5 rounded-2xl bg-white border border-[#ECE5F6] text-xs"
        />
        <button
          onClick={() => loadRecommendations(activeTab)}
          className="px-4 py-2.5 rounded-2xl bg-[#1E1B2E] text-white text-xs font-bold"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-10 rounded-3xl border border-[#ECE5F6] text-center text-xs text-[#706886]">
          Evaluating candidate profile and ranking opportunities...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mr-1.5">
                      {rec.job.availability_status}
                    </span>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                      {rec.eligibility_status}
                    </span>
                    <h3 className="font-heading font-bold text-base text-[#1E1B2E] mt-2">
                      {rec.job.title}
                    </h3>
                    <p className="text-xs text-[#524B68] font-medium">
                      {rec.job.company} • {rec.job.location} • {rec.job.work_arrangement} • {rec.job.employment_type}
                    </p>
                  </div>
                  <div className="px-3 py-2 rounded-2xl bg-purple-50 border border-purple-200 text-right shrink-0">
                    <span className="block text-[9px] uppercase font-bold text-purple-700">Match Score</span>
                    <span className="font-heading font-extrabold text-lg text-purple-900">{rec.match_score}%</span>
                  </div>
                </div>

                <p className="text-xs text-[#4B4462] mt-3 leading-relaxed">
                  {rec.why_recommended}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {rec.strong_matching_skills.slice(0, 5).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      ✓ {s}
                    </span>
                  ))}
                  {rec.missing_skills.slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                      Missing: {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#ECE5F6]">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRec(rec)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
                  >
                    View Explanation
                  </button>
                  <a
                    href={rec.job.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs font-bold text-[#1E1B2E] flex items-center gap-1"
                  >
                    Apply <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleToggleSave(rec)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#ECE5F6] text-xs font-semibold"
                  >
                    {rec.is_saved ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleMarkApplied(rec)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#ECE5F6] text-xs font-semibold"
                  >
                    {rec.application_status || 'Mark Applied'}
                  </button>
                  <button
                    onClick={() => handleDismiss(rec)}
                    className="px-2 py-1.5 rounded-xl border border-[#ECE5F6] text-xs text-slate-400 hover:text-rose-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRec && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedRec(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-[#1E1B2E]">
                  {selectedRec.job.title} - {selectedRec.job.company}
                </h2>
                <p className="text-xs text-[#706886]">
                  Source: {selectedRec.job.primary_source} • Match Score: {selectedRec.match_score}% ({selectedRec.eligibility_status})
                </p>
              </div>
              <button onClick={() => setSelectedRec(null)} className="text-xs font-bold text-[#706886]">Close</button>
            </div>
            <p className="text-xs text-[#4B4462] leading-relaxed">{selectedRec.why_recommended}</p>
            {selectedRec.best_resume_title && (
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs">
                <b>Best Resume for this Job:</b> {selectedRec.best_resume_title} ({selectedRec.best_resume_reason})
              </div>
            )}
            <div>
              <h4 className="font-bold text-xs text-[#1E1B2E]">How to Improve Your Chances:</h4>
              <ul className="list-disc pl-4 text-xs text-[#4B4462] mt-1 space-y-1">
                {selectedRec.preparation_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  FileText, 
  Upload, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  BookOpen,
  FolderGit2,
  User,
  RefreshCw,
  Check
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProfile = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await api.post('/profile/sync-from-resume');
      setSyncMsg('Master Profile synced from latest resume!');
      await fetchDashboard();
      setTimeout(() => setSyncMsg(''), 3500);
    } catch (err) {
      alert(err.response?.data?.detail || "Could not sync profile. Ensure you have an active uploaded resume.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-9 h-9 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate items for checklist
  const completeness = data?.resume_completeness_pct || 0;

  return (
    <div className="space-y-7 animate-fadeIn pb-12">
      {/* Welcome Hero Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            AI Career Readiness Hub
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1E1B2E] tracking-tight">
            Welcome back, {data?.user_name || 'Candidate'}!
          </h1>
          <p className="text-sm text-[#4B4462] mt-2 leading-relaxed">
            Your career profile is evaluated at{' '}
            <span className="text-purple-700 font-bold">{data?.overall_quality_score}% overall quality</span> with{' '}
            <span className="text-lime-700 font-bold">{data?.resume_completeness_pct}% completeness</span>.
            Use our AI tools to match against job descriptions, enhance accomplishment bullets, and export ATS-friendly resumes.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/upload"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 hover:shadow-lg transition-all active:scale-[0.99]"
            >
              <Upload className="w-4 h-4" />
              Upload Resume
            </Link>
            <Link
              to="/match"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50/80 text-[#2E2842] border border-[#ECE5F6] font-semibold text-xs hover:border-purple-300 transition-colors"
            >
              <Briefcase className="w-4 h-4 text-purple-600" />
              Analyze Target Job Description
            </Link>
            <Link
              to="/builder"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50/80 text-[#2E2842] border border-[#ECE5F6] font-semibold text-xs hover:border-purple-300 transition-colors"
            >
              <FileText className="w-4 h-4 text-purple-600" />
              ATS Resume Builder
            </Link>
            <button
              onClick={handleSyncProfile}
              disabled={syncing}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Master Profile'}
            </button>
          </div>

          {syncMsg && (
            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-50 border border-lime-200 text-lime-800 text-xs font-semibold shadow-sm animate-pulse">
              <Check className="w-4 h-4" />
              <span>{syncMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completeness */}
        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm hover:shadow-saas transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#706886] uppercase tracking-wider">Completeness</span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200/80">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-[#1E1B2E]">{completeness}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3.5 overflow-hidden">
            <div 
              className="bg-sky-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${completeness}%` }}
            ></div>
          </div>
        </div>

        {/* Quality Score */}
        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm hover:shadow-saas transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#706886] uppercase tracking-wider">Quality Score</span>
            <div className="p-2.5 rounded-2xl bg-lime-50 text-lime-700 border border-lime-200/80">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-[#1E1B2E]">{data?.overall_quality_score}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3.5 overflow-hidden">
            <div 
              className="bg-lime-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${data?.overall_quality_score || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Active Resumes */}
        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm hover:shadow-saas transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#706886] uppercase tracking-wider">Active Resumes</span>
            <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200/80">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-[#1E1B2E]">{data?.resume_count || 0}</span>
            <span className="text-xs text-[#706886] font-medium">stored</span>
          </div>
          <p className="text-[11px] text-[#706886] mt-2.5 truncate font-medium">
            {data?.active_resume_title || 'No resume uploaded yet'}
          </p>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm hover:shadow-saas transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#706886] uppercase tracking-wider">Recommendations</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-[#1E1B2E]">{data?.recommendations_count || 0}</span>
            <span className="text-xs text-[#706886] font-medium">ready</span>
          </div>
          <p className="text-[11px] text-[#706886] mt-2.5 font-medium">
            Targeted learning topics & project ideas
          </p>
        </div>
      </div>

      {/* Main Grid: Quality & Evaluations (Left) + Critical Gaps & Distribution (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quality & Evaluations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quality Indicators */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E] mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              Resume Quality Breakdown
            </h3>
            <div className="space-y-3">
              {data?.quality_indicators?.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-start justify-between gap-4">
                  <div>
                    <span className="font-semibold text-xs text-[#1E1B2E] block">{item.label}</span>
                    <p className="text-xs text-[#5C5572] mt-0.5 leading-relaxed">{item.message}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 border ${
                    item.status === 'EXCELLENT' ? 'bg-lime-50 text-lime-800 border-lime-200' :
                    item.status === 'GOOD' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                    'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Completeness Checklist (Actionable Breakdown) */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Profile Readiness Checklist
              </h3>
              <Link to="/profile" className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1">
                Edit Master Profile <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${completeness >= 20 ? 'bg-lime-500' : 'bg-amber-400'}`}></span>
                <div>
                  <span className="font-semibold text-[#1E1B2E]">Primary Career Details</span>
                  <p className="text-[11px] text-[#706886]">Headline, summary, location, contact coordinates</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${completeness >= 40 ? 'bg-lime-500' : 'bg-amber-400'}`}></span>
                <div>
                  <span className="font-semibold text-[#1E1B2E]">Work Experience History</span>
                  <p className="text-[11px] text-[#706886]">Positions and quantified accomplishment bullets</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${completeness >= 60 ? 'bg-lime-500' : 'bg-amber-400'}`}></span>
                <div>
                  <span className="font-semibold text-[#1E1B2E]">Technical Skills Inventory</span>
                  <p className="text-[11px] text-[#706886]">Mapped to 500+ canonical taxonomy skills</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${completeness >= 80 ? 'bg-lime-500' : 'bg-amber-400'}`}></span>
                <div>
                  <span className="font-semibold text-[#1E1B2E]">Projects & Demonstrations</span>
                  <p className="text-[11px] text-[#706886]">GitHub repositories and technical highlights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Evaluations */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-lime-600" />
                Recent Match Analyses
              </h3>
              <Link to="/match" className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1">
                New Analysis <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data?.recent_analyses?.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#706886] bg-[#FAF8FD] rounded-2xl border border-[#ECE5F6]">
                No job descriptions analyzed yet. Click "Analyze Target Job Description" to run your first evaluation.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.recent_analyses?.map((a) => (
                  <div 
                    key={a.id} 
                    onClick={() => navigate(`/match?analysisId=${a.id}`)}
                    className="p-4 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50/70 border border-[#ECE5F6] hover:border-purple-300 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-[#1E1B2E]">{a.job_title}</h4>
                      <p className="text-[11px] text-[#706886] mt-0.5">{a.company || 'Direct Posting'} • {a.created_at}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold font-heading px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {a.overall_score}% Fit
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Skill Category Distribution & Critical Gaps */}
        <div className="space-y-6">
          {/* Skill Category Distribution Widget (NEW!) */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-purple-600" />
              Skill Domain Distribution
            </h3>
            <p className="text-xs text-[#706886]">
              Verified skills grouped across technical categories.
            </p>

            {(!data?.skill_category_distribution || Object.keys(data.skill_category_distribution).length === 0) ? (
              <div className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#706886]">
                No categorized skills detected yet. Upload a resume to populate your domain strengths.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.skill_category_distribution).map(([cat, count]) => {
                  const maxCount = Math.max(...Object.values(data.skill_category_distribution), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-[#1E1B2E]">{cat}</span>
                        <span className="font-mono text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                          {count} {count === 1 ? 'skill' : 'skills'}
                        </span>
                      </div>
                      <div className="w-full bg-[#FAF8FD] h-2 rounded-full overflow-hidden border border-[#ECE5F6]">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Critical Gaps Alert */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E] mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-pink-600" />
              Critical Skill Gaps
            </h3>
            <p className="text-xs text-[#706886] mb-4">
              High priority requirements missing from your latest evaluation.
            </p>

            {data?.top_critical_gaps?.length === 0 ? (
              <div className="p-4 rounded-2xl bg-lime-50 border border-lime-200 text-lime-800 text-xs font-medium">
                No critical gaps identified in your latest evaluation!
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.top_critical_gaps?.map((g, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#1E1B2E]">{g.skill_name}</span>
                      <span className="text-[10px] text-pink-800 uppercase font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200">
                        {g.gap_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5C5572] leading-relaxed">{g.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Evidenced Strengths */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E] mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-600" />
              Top Evidenced Skills
            </h3>
            <p className="text-xs text-[#706886] mb-3">
              Validated technologies extracted from experience bullet points.
            </p>
            <div className="flex flex-wrap gap-2">
              {data?.top_strengths?.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-lime-50 text-lime-800 border border-lime-200 text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

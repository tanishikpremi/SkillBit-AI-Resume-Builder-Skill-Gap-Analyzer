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
  BookOpen
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Hero Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-800 glow-mesh relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Career Readiness Hub
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {data?.user_name || 'Candidate'}!
          </h1>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">
            Your profile is currently evaluated at{' '}
            <span className="text-blue-400 font-semibold">{data?.overall_quality_score}% overall quality</span> with{' '}
            <span className="text-emerald-400 font-semibold">{data?.resume_completeness_pct}% completeness</span>.
            Compare your resume against target roles to identify missing skills and generate learning paths.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/match"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all"
            >
              <Briefcase className="w-4 h-4" />
              Analyze Target Job Description
            </Link>
            <Link
              to="/upload"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-semibold text-xs transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Existing Resume
            </Link>
            <Link
              to="/builder"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-semibold text-xs transition-colors"
            >
              <FileText className="w-4 h-4" />
              ATS Resume Builder
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completeness</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">{data?.resume_completeness_pct}%</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${data?.resume_completeness_pct || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quality Score</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">{data?.overall_quality_score}%</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${data?.overall_quality_score || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Resumes</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">{data?.resume_count || 0}</span>
            <span className="text-xs text-gray-400">stored</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 truncate">
            {data?.active_resume_title || 'No resume uploaded yet'}
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recommendations</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-heading text-white">{data?.recommendations_count || 0}</span>
            <span className="text-xs text-gray-400">ready</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Personalized learning topics & project ideas
          </p>
        </div>
      </div>

      {/* Main Grid: Quality Indicators + Critical Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quality & Evaluations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quality Indicators */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <h3 className="font-heading font-bold text-base text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              Resume Quality Breakdown
            </h3>
            <div className="space-y-3">
              {data?.quality_indicators?.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-semibold text-xs text-gray-200 block">{item.label}</span>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.message}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 border ${
                    item.status === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                    item.status === 'GOOD' ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/25'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Evaluations */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Recent Match Analyses
              </h3>
              <Link to="/match" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                New Analysis <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data?.recent_analyses?.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 bg-gray-900/40 rounded-xl border border-gray-800">
                No job descriptions analyzed yet. Click "Analyze Target Job Description" to run your first evaluation.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.recent_analyses?.map((a) => (
                  <div 
                    key={a.id} 
                    onClick={() => navigate(`/match?analysisId=${a.id}`)}
                    className="p-3.5 rounded-xl bg-gray-900/60 hover:bg-gray-800/60 border border-gray-800 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-gray-200">{a.job_title}</h4>
                      <p className="text-[11px] text-gray-400">{a.company || 'Direct Posting'} • {a.created_at}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold font-heading text-blue-400">
                        {a.overall_score}% Fit
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Critical Gaps & Strengths */}
        <div className="space-y-6">
          {/* Critical Gaps Alert */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <h3 className="font-heading font-bold text-base text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Critical Skill Gaps
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              High priority requirements missing from your latest evaluation.
            </p>

            {data?.top_critical_gaps?.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                No critical gaps identified in your latest evaluation!
              </div>
            ) : (
              <div className="space-y-2.5">
                {data?.top_critical_gaps?.map((g, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-100">{g.skill_name}</span>
                      <span className="text-[10px] text-rose-400 uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/10">
                        {g.gap_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{g.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Evidenced Strengths */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <h3 className="font-heading font-bold text-base text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Top Evidenced Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {data?.top_strengths?.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-medium"
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

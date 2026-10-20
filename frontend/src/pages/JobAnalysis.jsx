import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ScoreGauge from '../components/ScoreGauge';
import GapCard from '../components/GapCard';
import { 
  Briefcase, 
  FileText, 
  Sparkles, 
  Search, 
  ArrowRight, 
  AlertCircle,
  Filter,
  CheckCircle2,
  RefreshCw,
  Target,
  Lightbulb,
  Compass,
  Check
} from 'lucide-react';

export default function JobAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(searchParams.get('resumeId') || '');
  
  const [jobTitle, setJobTitle] = useState('Senior Backend Cloud Engineer');
  const [company, setCompany] = useState('NextEra Cloud Systems');
  const [rawText, setRawText] = useState(
`Role: Senior Backend Cloud Engineer
Company: NextEra Cloud Systems

Requirements:
• 5+ years of experience with Python and FastAPI or Django.
• Strong foundation with PostgreSQL and query optimization.
• Hands-on expertise in Docker containerization and Kubernetes orchestration.
• Proven track record in RESTful APIs and System Design.

Preferred Qualifications:
• Experience with Apache Kafka or real-time event streaming.
• Exposure to AWS cloud services (S3, Lambda, ECS).
• Knowledge of Redis caching and performance tuning.`
  );

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [error, setError] = useState('');
  const [refreshingInsights, setRefreshingInsights] = useState(false);

  const handleRefreshInsights = async () => {
    if (!analysisResult?.id) return;
    setRefreshingInsights(true);
    try {
      const res = await api.post(`/match/${analysisResult.id}/ai-insights`);
      setAnalysisResult(prev => ({ ...prev, ai_insights: res.data }));
    } catch (err) {
      console.error("Failed to refresh AI insights:", err);
    } finally {
      setRefreshingInsights(false);
    }
  };

  useEffect(() => {
    fetchResumes();
    const existingAnalysisId = searchParams.get('analysisId');
    if (existingAnalysisId) {
      loadExistingAnalysis(existingAnalysisId);
    }
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resume');
      setResumes(res.data);
      if (res.data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load resumes:", err);
    }
  };

  const loadExistingAnalysis = async (id) => {
    try {
      const res = await api.get(`/match/${id}`);
      setAnalysisResult(res.data);
      setSelectedResumeId(res.data.resume_id);
    } catch (err) {
      console.error("Failed to load previous analysis:", err);
    }
  };

  const handleRunEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedResumeId) {
      setError('Please select or upload a resume first.');
      return;
    }
    if (!rawText.trim()) {
      setError('Job description text cannot be empty.');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      // 1. Analyze Job Description
      const jobRes = await api.post('/job/analyze', {
        title: jobTitle,
        company,
        raw_text: rawText
      });
      const jobId = jobRes.data.id;

      // 2. Run Hybrid Match Analysis
      const matchRes = await api.post('/match/analyze', {
        resume_id: selectedResumeId,
        job_id: jobId
      });
      setAnalysisResult(matchRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredGaps = analysisResult?.gaps?.filter(g => {
    if (filterStatus === 'ALL') return true;
    return g.gap_status === filterStatus;
  }) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-7 animate-fadeIn pb-16">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          Explainable Skill Gap Engine
        </div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1E1B2E]">
          Job Fit & Skill Gap Analyzer
        </h1>
        <p className="text-xs text-[#706886] mt-1">
          Perform explainable semantic matching, classify required vs preferred criteria, and detect verified skills vs gaps.
        </p>
      </div>

      {/* Input Configuration Panel */}
      <form onSubmit={handleRunEvaluation} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              Select Candidate Resume
            </label>
            <select
              value={selectedResumeId}
              onChange={e => setSelectedResumeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] font-medium focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
            >
              {resumes.length === 0 ? (
                <option value="">No resumes found - please create or upload one</option>
              ) : (
                resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.source_type})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              Target Role Title
            </label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
              Company (Optional)
            </label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Google, AWS, Stripe"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#332D47] uppercase tracking-wider mb-1.5">
            Target Job Description (Paste raw job posting text)
          </label>
          <textarea
            rows={6}
            required
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste job posting details here..."
            className="w-full p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white font-mono leading-relaxed transition-colors"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={analyzing}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 hover:shadow-lg transition-all disabled:opacity-50 active:scale-[0.99]"
          >
            {analyzing ? 'Running Hybrid NLP Match Pipeline...' : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Match & Skill Gap Analysis</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Score & Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Visual Gauge */}
            <div>
              <ScoreGauge
                score={analysisResult.overall_score}
                exactScore={analysisResult.exact_match_score}
                semanticScore={analysisResult.semantic_score}
                experienceScore={analysisResult.experience_score}
                disclaimer={analysisResult.disclaimer}
              />
            </div>

            {/* Target Job Overview & Summary */}
            <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold mb-2.5">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  Target Evaluation Summary
                </div>
                <h3 className="font-heading font-extrabold text-xl text-[#1E1B2E]">
                  {analysisResult.job_title} {analysisResult.company && `at ${analysisResult.company}`}
                </h3>
                <p className="text-xs text-[#706886] mt-1 font-medium">
                  Evaluated {analysisResult.total_job_skills} key technical requirements.
                </p>

                <div className="grid grid-cols-3 gap-3.5 mt-6">
                  <div className="p-3.5 rounded-2xl bg-lime-50 border border-lime-200">
                    <span className="text-[11px] uppercase font-bold text-lime-900 block">Matched Skills</span>
                    <span className="text-2xl font-extrabold text-lime-700 mt-0.5 block">{analysisResult.matched_count}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200">
                    <span className="text-[11px] uppercase font-bold text-pink-900 block">Identified Gaps</span>
                    <span className="text-2xl font-extrabold text-pink-700 mt-0.5 block">
                      {analysisResult.total_job_skills - analysisResult.matched_count}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
                    <span className="text-[11px] uppercase font-bold text-sky-900 block">Core Required</span>
                    <span className="text-2xl font-extrabold text-sky-700 mt-0.5 block">
                      {analysisResult.gaps.filter(g => g.importance === 'REQUIRED').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Career Intelligence Insights Card */}
          {analysisResult.ai_insights && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-5 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#ECE5F6]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#1E1B2E]">
                        AI Strategic Career Advisor
                      </h3>
                      {analysisResult.ai_insights.provider_used && (
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {analysisResult.ai_insights.provider_used}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#706886] mt-0.5">
                      Synthesized executive readiness assessment and high-impact action recommendations.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                    analysisResult.ai_insights.readiness_pill_color === 'lime'
                      ? 'bg-lime-50 text-lime-800 border-lime-200'
                      : analysisResult.ai_insights.readiness_pill_color === 'rose'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {analysisResult.ai_insights.readiness_level || 'Evaluated'}
                  </span>
                  <button
                    onClick={handleRefreshInsights}
                    disabled={refreshingInsights}
                    title="Re-run AI evaluation"
                    className="p-2 rounded-xl bg-[#FAF8FD] hover:bg-purple-50 text-[#706886] hover:text-purple-700 border border-[#ECE5F6] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingInsights ? 'animate-spin text-purple-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Executive Summary */}
              {analysisResult.ai_insights.executive_summary && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D93B4] block mb-1">
                    Executive Career Assessment
                  </span>
                  <p className="text-xs sm:text-sm text-[#1E1B2E] font-medium leading-relaxed">
                    "{analysisResult.ai_insights.executive_summary}"
                  </p>
                </div>
              )}

              {/* 2-Column Priorities & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority Improvements */}
                {analysisResult.ai_insights.top_improvement_priorities?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      Highest-Impact Improvement Areas
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#332D47]">
                      {analysisResult.ai_insights.top_improvement_priorities.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strategic Pre-Application Actions */}
                {analysisResult.ai_insights.strategic_action_plan?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-lime-50/50 border border-lime-200/80 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-lime-900 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-lime-600" />
                      Recommended Next Actions
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#332D47]">
                      {analysisResult.ai_insights.strategic_action_plan.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-lime-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* CTA to Sequential Roadmaps */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-purple-50/60 p-4 rounded-2xl border border-purple-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-xs text-[#1E1B2E]">
                      Explore roadmap.sh-Style Sequential Learning Trees
                    </h4>
                    <p className="text-[11px] text-[#706886]">
                      Step-by-step topic roadmaps generated for your identified skill gaps.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/recommendations?analysisId=${analysisResult.id}`)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all shrink-0 active:scale-[0.99]"
                >
                  <span>Open Skill Roadmaps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Gaps List & Filter Controls */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#ECE5F6]">
              <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-600" />
                Skill Breakdown & Evidence Analysis
              </h3>

              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                {['ALL', 'STRONG_MATCH', 'WEAK_EVIDENCE', 'MISSING'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setFilterStatus(filter)}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                      filterStatus === filter
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-[#FAF8FD] text-[#5C5572] hover:bg-purple-50 border border-[#ECE5F6]'
                    }`}
                  >
                    {filter.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {filteredGaps.map((gap, idx) => (
                <GapCard
                  key={idx}
                  gap={gap}
                  analysisId={analysisResult.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

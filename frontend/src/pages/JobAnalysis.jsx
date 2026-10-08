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
  BookOpen
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
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-16">
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
          Job Fit & Skill Gap Analyzer
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Perform explainable semantic matching, classify required vs preferred criteria, and detect verified skills vs gaps.
        </p>
      </div>

      {/* Input Configuration Panel */}
      <form onSubmit={handleRunEvaluation} className="glass-panel p-6 sm:p-7 rounded-2xl border border-gray-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Select Candidate Resume
            </label>
            <select
              value={selectedResumeId}
              onChange={e => setSelectedResumeId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500"
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
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Target Role Title
            </label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Company (Optional)
            </label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Google, AWS, Stripe"
              className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
            Target Job Description (Paste raw job posting text)
          </label>
          <textarea
            rows={6}
            required
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste job posting details here..."
            className="w-full p-3.5 rounded-xl bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={analyzing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
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
          {/* Top Score Banner & Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Gauge */}
            <div className="lg:col-span-1">
              <ScoreGauge
                score={analysisResult.overall_score}
                exactScore={analysisResult.exact_match_score}
                experienceScore={analysisResult.experience_score}
                semanticScore={analysisResult.semantic_score}
                disclaimer={analysisResult.disclaimer}
              />
            </div>

            {/* Target Job Overview & Summary */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  Target Evaluation Target
                </div>
                <h3 className="font-heading font-extrabold text-xl text-white">
                  {analysisResult.job_title} {analysisResult.company && `at ${analysisResult.company}`}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Evaluated {analysisResult.total_job_skills} key technical requirements.
                </p>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Matched Skills</span>
                    <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">{analysisResult.matched_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Identified Gaps</span>
                    <span className="text-xl font-extrabold text-rose-400 mt-0.5 block">
                      {analysisResult.total_job_skills - analysisResult.matched_count}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Core Requirements</span>
                    <span className="text-xl font-extrabold text-blue-400 mt-0.5 block">
                      {analysisResult.gaps.filter(g => g.importance === 'REQUIRED').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Ready to bridge these gaps?
                </span>
                <button
                  onClick={() => navigate(`/recommendations?analysisId=${analysisResult.id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View Targeted Learning & Certification Roadmaps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Gaps List & Filter Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" />
                Skill Breakdown & Evidence Analysis
              </h3>

              <div className="flex items-center gap-1.5 text-xs">
                {['ALL', 'STRONG_MATCH', 'WEAK_EVIDENCE', 'MISSING'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setFilterStatus(filter)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterStatus === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800/80 text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
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

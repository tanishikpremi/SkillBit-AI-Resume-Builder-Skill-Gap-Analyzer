import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  BookOpen, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Award, 
  FileText, 
  ArrowLeft 
} from 'lucide-react';

export default function Recommendations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [analysisId, setAnalysisId] = useState(searchParams.get('analysisId') || '');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedBullets, setAppliedBullets] = useState({});

  useEffect(() => {
    fetchRecommendations();
  }, [analysisId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let targetId = analysisId;
      if (!targetId) {
        // Fetch latest analysis
        const histRes = await api.get('/match/history');
        if (histRes.data && histRes.data.length > 0) {
          targetId = histRes.data[0].id;
          setAnalysisId(targetId);
        }
      }

      if (targetId) {
        const res = await api.get(`/recommendations/${targetId}`);
        setRecommendations(res.data);
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBullet = (id, bulletText) => {
    navigator.clipboard.writeText(bulletText);
    setAppliedBullets({ ...appliedBullets, [id]: true });
    setTimeout(() => {
      setAppliedBullets(prev => ({ ...prev, [id]: false }));
    }, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/match')}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Match Evaluation
          </button>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
            Targeted Skill Roadmaps & Recommendations
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Actionable learning paths, practice projects, certifications, and STAR resume bullets tailored to your detected gaps.
          </p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl border border-gray-800 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="font-heading font-bold text-base text-white">
            No Active Gaps Requiring Roadmaps!
          </h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            You either have a strong match across all requirements in your latest evaluation, or haven't evaluated a job description yet.
          </p>
          <button
            onClick={() => navigate('/match')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Evaluate New Job Description
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {recommendations.map((rec) => (
            <div key={rec.skill_id} className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-heading font-bold">
                    {rec.skill_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-white">
                      {rec.skill_name}
                    </h3>
                    <p className="text-xs text-blue-400 font-medium">
                      {rec.learning_topic}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                    rec.gap_status === 'MISSING' 
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {rec.gap_status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Core Concepts Grid */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Key Concepts to Master
                </span>
                <div className="flex flex-wrap gap-2">
                  {rec.concepts?.map((c, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Practice Project Idea */}
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                  Demonstration Practice Project
                </span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {rec.practice_project}
                </p>
              </div>

              {/* Certification & Resource Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rec.certification_name && (
                  <div className="p-3.5 rounded-xl bg-gray-900/40 border border-gray-800 flex items-center gap-3">
                    <Award className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">
                        Recommended Certification
                      </span>
                      <span className="text-xs font-semibold text-gray-200">
                        {rec.certification_name}
                      </span>
                    </div>
                  </div>
                )}

                {rec.resource_url && (
                  <a
                    href={rec.resource_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 rounded-xl bg-gray-900/40 hover:bg-gray-800/60 border border-gray-800 flex items-center justify-between text-xs text-blue-400 transition-colors"
                  >
                    <span className="font-semibold">Official Documentation & Tutorials</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Suggested STAR Resume Bullet */}
              {rec.suggested_resume_bullet && (
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Suggested Resume Bullet Phrasing
                    </span>
                    <button
                      onClick={() => handleCopyBullet(rec.skill_id, rec.suggested_resume_bullet)}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-semibold"
                    >
                      {appliedBullets[rec.skill_id] ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</span>
                      ) : (
                        'Copy Bullet'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 italic">
                    "{rec.suggested_resume_bullet}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

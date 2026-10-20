import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import RoadmapTree from '../components/RoadmapTree';
import { 
  BookOpen, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Award, 
  FileText, 
  ArrowLeft,
  Plus,
  Compass,
  AlertCircle
} from 'lucide-react';

export default function Recommendations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [analysisId, setAnalysisId] = useState(searchParams.get('analysisId') || '');
  const [recommendations, setRecommendations] = useState([]);
  const [selectedSkillName, setSelectedSkillName] = useState(searchParams.get('skill') || '');
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [activeProvider, setActiveProvider] = useState('SkillBit Engine');
  
  // Custom skill roadmap modal / input state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('Software Engineer');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRecommendations();
    fetchLLMProvider();
  }, [analysisId]);

  const fetchLLMProvider = async () => {
    try {
      const res = await api.get('/match/llm-provider');
      if (res.data?.name) {
        setActiveProvider(res.data.name);
      }
    } catch {
      // Non-critical
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let targetId = analysisId;
      if (!targetId) {
        const histRes = await api.get('/match/history');
        if (histRes.data && histRes.data.length > 0) {
          targetId = histRes.data[0].id;
          setAnalysisId(targetId);
        }
      }

      if (targetId) {
        const res = await api.get(`/recommendations/${targetId}`);
        setRecommendations(res.data);
        
        // Select initial skill from query param or first available
        const querySkill = searchParams.get('skill');
        if (querySkill && res.data.some(r => r.skill_name.toLowerCase() === querySkill.toLowerCase())) {
          setSelectedSkillName(querySkill);
        } else if (res.data.length > 0) {
          setSelectedSkillName(res.data[0].skill_name);
        }
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeRec = recommendations.find(
    r => r.skill_name.toLowerCase() === selectedSkillName.toLowerCase()
  ) || recommendations[0];

  const handleSelectSkill = (name) => {
    setSelectedSkillName(name);
    setSearchParams(prev => {
      prev.set('skill', name);
      return prev;
    });
  };

  const handleRegenerateAI = async () => {
    if (!activeRec) return;
    setGeneratingAI(true);
    try {
      const res = await api.post('/recommendations/generate-roadmap', {
        skill_name: activeRec.skill_name,
        target_role: customRoleInput || "Software Engineer",
        candidate_level: "Intermediate"
      });

      // Update in-memory roadmap for this skill
      setRecommendations(prev => prev.map(r => {
        if (r.skill_name.toLowerCase() === activeRec.skill_name.toLowerCase()) {
          return { ...r, learning_path: res.data.learning_path };
        }
        return r;
      }));
    } catch (err) {
      console.error("AI roadmap regeneration error:", err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleCreateCustomRoadmap = async (e) => {
    e.preventDefault();
    if (!customSkillInput.trim()) return;
    setGeneratingAI(true);
    setErrorMsg('');

    try {
      const res = await api.post('/recommendations/generate-roadmap', {
        skill_name: customSkillInput.trim(),
        target_role: customRoleInput.trim() || "Software Engineer",
        candidate_level: "Intermediate"
      });

      const newRec = {
        id: `custom_${Date.now()}`,
        skill_id: `custom_${customSkillInput}`,
        skill_name: customSkillInput.trim(),
        gap_status: 'EXPLORE',
        priority: 'MEDIUM',
        learning_topic: `Sequential Roadmap for ${customSkillInput.trim()}`,
        concepts: ["Fundamentals", "Core Patterns", "Production Architecture"],
        learning_path: res.data.learning_path,
        practice_project: `Build and deploy a proof-of-concept repository using ${customSkillInput.trim()}.`,
        resource_url: `https://devdocs.io/#q=${encodeURIComponent(customSkillInput.trim().toLowerCase())}`
      };

      setRecommendations(prev => [newRec, ...prev]);
      setSelectedSkillName(newRec.skill_name);
      setShowCustomModal(false);
      setCustomSkillInput('');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to generate AI roadmap.");
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-fadeIn pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/match')}
            className="inline-flex items-center gap-1.5 text-xs text-[#706886] hover:text-purple-700 font-medium mb-2.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Match Evaluation
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1E1B2E]">
              Skill Roadmaps
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              {activeProvider}
            </span>
          </div>
          <p className="text-xs text-[#706886] mt-1">
            Simplified roadmap.sh-style sequential learning paths tailored to your detected gaps.
          </p>
        </div>

        {/* Action: Custom Tech Roadmap */}
        <button
          onClick={() => setShowCustomModal(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Explore Any Tech Roadmap</span>
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-[#ECE5F6] shadow-saas text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-lime-50 border border-lime-200 text-lime-700 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-lg text-[#1E1B2E]">
            No Active Gaps Requiring Roadmaps!
          </h3>
          <p className="text-xs text-[#706886] max-w-md mx-auto leading-relaxed">
            You either have a strong match across all requirements in your latest evaluation, or haven't evaluated a job description yet.
          </p>
          <button
            onClick={() => navigate('/match')}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all"
          >
            Evaluate New Job Description
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Skill Selector Tabs Bar */}
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#ECE5F6] shadow-saas-sm flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9D93B4] px-2 shrink-0">
              Target Skills:
            </span>
            {recommendations.map((rec) => {
              const isSelected = activeRec?.skill_name.toLowerCase() === rec.skill_name.toLowerCase();
              return (
                <button
                  key={rec.id || rec.skill_name}
                  onClick={() => handleSelectSkill(rec.skill_name)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-[#FAF8FD] text-[#524B68] hover:bg-purple-50 hover:text-purple-700 border border-[#ECE5F6]'
                  }`}
                >
                  <span>{rec.skill_name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : rec.gap_status === 'MISSING'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {rec.gap_status === 'MISSING' ? 'Gap' : rec.gap_status === 'WEAK_EVIDENCE' ? 'Evidence' : 'Explore'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Skill Roadmap Tree */}
          {activeRec && (
            <RoadmapTree
              skillName={activeRec.skill_name}
              learningPath={activeRec.learning_path || []}
              practiceProject={activeRec.practice_project}
              certificationName={activeRec.certification_name}
              resourceUrl={activeRec.resource_url}
              onRegenerateAI={handleRegenerateAI}
              isGenerating={generatingAI}
            />
          )}
        </div>
      )}

      {/* Modal: Explore Any Tech Roadmap */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-[#11121F]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#ECE5F6] w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE5F6] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E1B2E]">AI Sequential Roadmap Generator</h3>
                  <p className="text-[11px] text-[#706886]">Generate roadmap.sh tree with {activeProvider}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="w-8 h-8 rounded-xl bg-[#FAF8FD] hover:bg-[#F3EEFA] text-[#706886] hover:text-[#1E1B2E] flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomRoadmap} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                  Technology or Skill to Master
                </label>
                <input
                  type="text"
                  required
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  placeholder="e.g. GraphQL, Terraform, Redis, Rust, Next.js"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                  Target Career Role
                </label>
                <input
                  type="text"
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  placeholder="e.g. Full-Stack Engineer, Cloud Architect"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={generatingAI}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generatingAI ? 'Generating Sequential Steps...' : 'Generate Roadmap Tree'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

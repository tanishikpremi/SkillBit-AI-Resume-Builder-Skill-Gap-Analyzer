import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Target, 
  Terminal,
  Compass,
  Check,
  Layers,
  Award
} from 'lucide-react';

export default function RoadmapTree({ skillName, learningPath, practiceProject, certificationName, resourceUrl, onRegenerateAI, isGenerating }) {
  // Local storage checklist for interactive completion
  const [completedTopics, setCompletedTopics] = useState(() => {
    try {
      const saved = localStorage.getItem(`skillbit_roadmap_${skillName}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`skillbit_roadmap_${skillName}`);
      setCompletedTopics(saved ? JSON.parse(saved) : {});
    } catch {
      setCompletedTopics({});
    }
  }, [skillName]);

  const toggleTopic = (stageIdx, topicIdx) => {
    const key = `${stageIdx}_${topicIdx}`;
    const updated = { ...completedTopics, [key]: !completedTopics[key] };
    setCompletedTopics(updated);
    try {
      localStorage.setItem(`skillbit_roadmap_${skillName}`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save progress:", e);
    }
  };

  const stages = learningPath && learningPath.length > 0 ? learningPath : [];

  // Calculate total topics vs completed
  let totalTopics = 0;
  let finishedTopics = 0;
  stages.forEach((stage, sIdx) => {
    const topics = stage.topics_in_sequence || [];
    topics.forEach((_, tIdx) => {
      totalTopics++;
      if (completedTopics[`${sIdx}_${tIdx}`]) finishedTopics++;
    });
  });

  const progressPercent = totalTopics > 0 ? Math.round((finishedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Roadmap Header Summary Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white flex items-center justify-center font-heading font-extrabold text-xl shadow-md shadow-purple-500/20 shrink-0">
            {skillName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-extrabold text-xl text-[#1E1B2E]">
                {skillName} Learning Path
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                roadmap.sh sequential tree
              </span>
            </div>
            <p className="text-xs text-[#706886] mt-0.5">
              Master topics in exact sequence from foundations to production-ready portfolio proof.
            </p>
          </div>
        </div>

        {/* Progress & AI Re-generate Button */}
        <div className="flex items-center gap-4 shrink-0 flex-wrap sm:flex-nowrap">
          {totalTopics > 0 && (
            <div className="min-w-[130px]">
              <div className="flex items-center justify-between text-xs font-semibold mb-1 text-[#332D47]">
                <span>Progress</span>
                <span className="text-purple-600 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#FAF8FD] border border-[#ECE5F6] overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-[#9D93B4] font-medium block mt-0.5">
                {finishedTopics} of {totalTopics} topics mastered
              </span>
            </div>
          )}

          {onRegenerateAI && (
            <button
              onClick={onRegenerateAI}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 border border-[#ECE5F6] hover:border-purple-200 text-xs font-bold text-purple-700 shadow-xs transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{isGenerating ? 'AI Generating...' : 'Regenerate with AI'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Roadmap Tree Spine & Nodes */}
      <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-indigo-400 before:to-purple-200">
        {stages.map((stage, stageIdx) => {
          const topics = stage.topics_in_sequence || [];
          const isFinalStage = stageIdx === stages.length - 1;
          const stageAllDone = topics.length > 0 && topics.every((_, tIdx) => completedTopics[`${stageIdx}_${tIdx}`]);

          return (
            <div key={stageIdx} className="relative group">
              {/* Spine Node Marker */}
              <div className={`absolute -left-6 sm:-left-10 top-5 w-6 sm:w-10 h-6 sm:h-10 rounded-2xl flex items-center justify-center font-heading font-extrabold text-xs transition-all ring-4 ring-[#F5F2FC] shadow-sm ${
                stageAllDone
                  ? 'bg-lime-500 text-white'
                  : 'bg-white text-purple-700 border-2 border-purple-500 group-hover:scale-105'
              }`}>
                {stageAllDone ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                ) : (
                  <span>0{stage.stage_number || stageIdx + 1}</span>
                )}
              </div>

              {/* Stage Container Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#ECE5F6] shadow-saas hover:shadow-saas-hover transition-all">
                {/* Stage Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#ECE5F6]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        Step 0{stage.stage_number || stageIdx + 1}
                      </span>
                      <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#1E1B2E]">
                        {stage.stage_title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {stage.estimated_duration && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#706886] bg-[#FAF8FD] px-2.5 py-1 rounded-full border border-[#ECE5F6]">
                        <Clock className="w-3 h-3 text-[#9D93B4]" />
                        {stage.estimated_duration}
                      </span>
                    )}

                    {stage.doc_url && (
                      <a
                        href={stage.doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100/60 px-2.5 py-1 rounded-full border border-purple-200 transition-colors"
                      >
                        <span>Docs</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Sequential Topics Checklist */}
                <div className="pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D93B4] flex items-center gap-1.5 mb-2.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    Topics to master in sequence (Click to complete)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {topics.map((topic, topicIdx) => {
                      const isDone = !!completedTopics[`${stageIdx}_${topicIdx}`];
                      return (
                        <button
                          key={topicIdx}
                          type="button"
                          onClick={() => toggleTopic(stageIdx, topicIdx)}
                          className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                            isDone
                              ? 'bg-lime-50/70 border-lime-200 text-lime-900 shadow-xs'
                              : 'bg-[#FAF8FD] hover:bg-white hover:border-purple-300 border-[#ECE5F6] text-[#1E1B2E]'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-lime-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#9D93B4]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-[#9D93B4] block">
                              {stageIdx + 1}.{topicIdx + 1}
                            </span>
                            <span className={`text-xs font-semibold leading-snug block ${isDone ? 'line-through text-lime-800' : 'text-[#332D47]'}`}>
                              {topic}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hands-on Milestone / Practice Project */}
                {stage.practice_milestone && (
                  <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white border border-purple-200 text-purple-700 shrink-0 shadow-xs">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-900 block mb-0.5">
                        Hands-On Stage Milestone
                      </span>
                      <p className="text-xs text-[#332D47] leading-relaxed font-normal">
                        {stage.practice_milestone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Capstone Proof Box & Certification Footer */}
      {(practiceProject || certificationName || resourceUrl) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {practiceProject && (
            <div className="bg-lime-50/70 p-5 rounded-3xl border border-lime-200/90 space-y-1.5 shadow-saas-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-lime-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lime-700" />
                Recommended Portfolio Capstone Project
              </span>
              <p className="text-xs text-lime-950 leading-relaxed font-normal">
                {practiceProject}
              </p>
            </div>
          )}

          {certificationName && (
            <div className="bg-[#FAF8FD] p-5 rounded-3xl border border-[#ECE5F6] flex items-center gap-3.5 shadow-saas-sm">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#706886] block">
                  Industry Certification Standard
                </span>
                <span className="text-xs font-bold text-[#1E1B2E]">
                  {certificationName}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

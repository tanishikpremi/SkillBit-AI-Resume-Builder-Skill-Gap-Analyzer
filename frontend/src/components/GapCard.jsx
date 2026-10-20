import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  FileSearch,
  Target,
  Compass
} from 'lucide-react';

export default function GapCard({ gap, analysisId }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'STRONG_MATCH':
        return {
          icon: CheckCircle2,
          label: 'Strong Match',
          classes: 'bg-lime-50 text-lime-800 border-lime-200',
          iconColor: 'text-lime-600'
        };
      case 'WEAK_EVIDENCE':
        return {
          icon: AlertTriangle,
          label: 'Weak Evidence',
          classes: 'bg-amber-50 text-amber-800 border-amber-200',
          iconColor: 'text-amber-600'
        };
      case 'PARTIAL_MATCH':
        return {
          icon: HelpCircle,
          label: 'Partial Match',
          classes: 'bg-sky-50 text-sky-800 border-sky-200',
          iconColor: 'text-sky-600'
        };
      default: // MISSING
        return {
          icon: XCircle,
          label: 'Missing Gap',
          classes: 'bg-pink-50 text-pink-800 border-pink-200',
          iconColor: 'text-pink-600'
        };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-pink-100/80 text-pink-900 border-pink-200';
      case 'MEDIUM':
        return 'bg-amber-100/80 text-amber-900 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const statusConfig = getStatusBadge(gap.gap_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE5F6] shadow-saas-sm hover:shadow-saas transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl border ${statusConfig.classes}`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-heading font-bold text-base text-[#1E1B2E]">
                {gap.skill_name}
              </h4>
              <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
                {gap.category}
              </span>
            </div>
            <p className="text-xs text-[#706886] mt-0.5 flex items-center gap-1.5">
              {gap.importance === 'REQUIRED' ? (
                <span className="text-pink-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                  Core Requirement
                </span>
              ) : (
                <span className="text-sky-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  Preferred Bonus
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gap.gap_status !== 'STRONG_MATCH' && analysisId && (
            <button
              onClick={() => navigate(`/recommendations?analysisId=${analysisId}&skill=${encodeURIComponent(gap.skill_name)}`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100/70 border border-purple-200 text-purple-700 text-[11px] font-bold transition-all shadow-xs"
              title={`View ${gap.skill_name} sequential learning roadmap`}
            >
              <Compass className="w-3 h-3 text-purple-600" />
              <span>Roadmap</span>
            </button>
          )}
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getPriorityBadge(gap.priority)}`}>
            {gap.priority} Priority
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-colors"
            aria-label="Toggle details"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Primary explainable reason */}
      <p className="text-xs text-[#332D47] mt-3 leading-relaxed font-normal">
        {gap.reason}
      </p>

      {/* Expanded evidence details */}
      {expanded && (
        <div className="mt-4 pt-3.5 border-t border-[#ECE5F6] flex flex-col gap-2.5 text-xs animate-fadeIn">
          <div className="bg-[#FAF8FD] p-3 rounded-xl border border-[#ECE5F6]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-800 flex items-center gap-1.5 mb-1">
              <FileSearch className="w-3.5 h-3.5 text-purple-600" />
              Resume Evidence Found:
            </span>
            <p className="text-[#332D47] italic">
              {gap.resume_evidence || 'No verifiable mentions identified in uploaded resume.'}
            </p>
          </div>

          <div className="bg-[#FAF8FD] p-3 rounded-xl border border-[#ECE5F6]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-800 flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-purple-600" />
              Target Job Specification Snippet:
            </span>
            <p className="text-[#332D47]">
              {gap.job_requirement_snippet}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

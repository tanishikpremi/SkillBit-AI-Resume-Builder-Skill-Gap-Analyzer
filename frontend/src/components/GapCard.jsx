import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GapCard({ gap, analysisId }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'STRONG_MATCH':
        return {
          icon: CheckCircle2,
          label: 'Strong Match',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        };
      case 'WEAK_EVIDENCE':
        return {
          icon: AlertTriangle,
          label: 'Weak Evidence',
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        };
      case 'PARTIAL_MATCH':
        return {
          icon: HelpCircle,
          label: 'Partial Match',
          classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        };
      default: // MISSING
        return {
          icon: XCircle,
          label: 'Missing Gap',
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-gray-700/40 text-gray-400 border-gray-600/30';
    }
  };

  const statusConfig = getStatusBadge(gap.gap_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="glass-card rounded-xl p-4 border border-gray-800 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${statusConfig.classes}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-semibold text-base text-gray-100">
                {gap.skill_name}
              </h4>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                {gap.category}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {gap.importance === 'REQUIRED' ? (
                <span className="text-rose-400 font-medium">Core Requirement</span>
              ) : (
                <span className="text-blue-400 font-medium">Preferred Bonus</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${getPriorityBadge(gap.priority)}`}>
            {gap.priority} Priority
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/80 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Primary explainable reason */}
      <p className="text-xs text-gray-300 mt-3 leading-relaxed">
        {gap.reason}
      </p>

      {/* Expanded evidence details */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-gray-800/80 flex flex-col gap-2.5 text-xs animate-fadeIn">
          <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
              Resume Evidence Found:
            </span>
            <p className="text-gray-300 italic">
              {gap.resume_evidence || 'No verifiable mentions in resume.'}
            </p>
          </div>

          <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
              Target Job Specification:
            </span>
            <p className="text-gray-300">
              {gap.job_requirement_snippet}
            </p>
          </div>

          {gap.gap_status !== 'STRONG_MATCH' && (
            <button
              onClick={() => navigate(`/recommendations?analysisId=${analysisId}&skill=${encodeURIComponent(gap.skill_name)}`)}
              className="mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              View Actionable Learning Roadmap & STAR Bullet
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

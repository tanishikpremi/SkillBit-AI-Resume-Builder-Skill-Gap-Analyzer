import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function ScoreGauge({ 
  score = 0, 
  exactScore = 0, 
  semanticScore = 0, 
  experienceScore = 0,
  disclaimer 
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (val) => {
    if (val >= 75) return { stroke: '#10B981', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (val >= 50) return { stroke: '#F59E0B', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    return { stroke: '#EF4444', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
  };

  const currentTheme = getColor(score);

  return (
    <div className="glass-card p-6 rounded-2xl border border-gray-800 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <ShieldCheck className="w-4 h-4 text-blue-400" />
        Transparent Match Alignment Indicator
      </div>

      {/* SVG Radial Gauge */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#1F2937"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={currentTheme.stroke}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-4xl font-extrabold font-heading ${currentTheme.text}`}>
            {score}%
          </span>
          <span className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mt-0.5">
            Fit Index
          </span>
        </div>
      </div>

      {/* Sub-scores breakdown */}
      <div className="grid grid-cols-3 gap-3 w-full mt-6 pt-5 border-t border-gray-800">
        <div className="flex flex-col items-center p-2 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <span className="text-xs text-gray-400 font-medium">Exact Skills</span>
          <span className="text-base font-bold text-gray-200 mt-0.5">{exactScore}%</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <span className="text-xs text-gray-400 font-medium">Experience</span>
          <span className="text-base font-bold text-gray-200 mt-0.5">{experienceScore}%</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-gray-900/60 border border-gray-800/80">
          <span className="text-xs text-gray-400 font-medium">Semantic Fit</span>
          <span className="text-base font-bold text-gray-200 mt-0.5">{semanticScore}%</span>
        </div>
      </div>

      {/* Responsible AI Disclaimer */}
      {disclaimer && (
        <div className="mt-4 flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-left">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

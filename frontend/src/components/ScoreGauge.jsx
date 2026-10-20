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
    if (val >= 75) return { stroke: '#84CC16', text: 'text-lime-700', bg: 'bg-lime-50', border: 'border-lime-200' };
    if (val >= 50) return { stroke: '#F59E0B', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { stroke: '#F43F5E', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
  };

  const currentTheme = getColor(score);

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-col items-center text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 text-[11px] font-semibold uppercase tracking-wider mb-5">
        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
        Transparent Match Alignment
      </div>

      {/* SVG Radial Gauge */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#F0EBF9"
            strokeWidth="11"
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={currentTheme.stroke}
            strokeWidth="11"
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
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
            Fit Index
          </span>
        </div>
      </div>

      {/* Sub-scores breakdown */}
      <div className="grid grid-cols-3 gap-2.5 w-full mt-6 pt-5 border-t border-[#ECE5F6]">
        <div className="flex flex-col items-center p-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6]">
          <span className="text-[11px] text-slate-500 font-medium">Exact Skills</span>
          <span className="text-base font-extrabold text-[#1E1B2E] mt-0.5">{exactScore}%</span>
        </div>
        <div className="flex flex-col items-center p-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6]">
          <span className="text-[11px] text-slate-500 font-medium">Experience</span>
          <span className="text-base font-extrabold text-[#1E1B2E] mt-0.5">{experienceScore}%</span>
        </div>
        <div className="flex flex-col items-center p-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6]">
          <span className="text-[11px] text-slate-500 font-medium">Semantic Fit</span>
          <span className="text-base font-extrabold text-[#1E1B2E] mt-0.5">{semanticScore}%</span>
        </div>
      </div>

      {/* Responsible AI Disclaimer */}
      {disclaimer && (
        <div className="mt-4 flex items-start gap-2.5 p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-left">
          <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-purple-900 leading-relaxed font-medium">
            {disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

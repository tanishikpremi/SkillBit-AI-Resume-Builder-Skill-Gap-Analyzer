import React, { useState } from 'react';
import { Sparkles, Check, X, Edit3, ShieldAlert } from 'lucide-react';

export default function BulletSuggestionModal({ 
  isOpen, 
  onClose, 
  originalBullet, 
  suggestedBullet, 
  changesExplained, 
  onAccept 
}) {
  const [editedText, setEditedText] = useState(suggestedBullet || '');

  React.useEffect(() => {
    setEditedText(suggestedBullet || '');
  }, [suggestedBullet]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-7 border border-[#ECE5F6] shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#ECE5F6]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#1E1B2E]">
                STAR Bullet Point Optimizer
              </h3>
              <p className="text-xs text-[#706886]">
                Action-oriented, quantified structural refinement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Comparison */}
        <div className="mt-5 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#706886] block mb-1.5">
              Original Phrasing:
            </span>
            <div className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#5C5572] italic">
              "{originalBullet}"
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                STAR Suggestion (Editable by You):
              </span>
              <span className="text-[10px] text-[#706886] font-medium">Customize with your exact numbers</span>
            </div>
            <textarea
              rows={3}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#FAF8FD] border border-purple-300 text-xs text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white font-sans leading-relaxed transition-colors"
            />
          </div>

          {/* Explanation of changes */}
          {changesExplained && (
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs text-purple-900 leading-relaxed">
              <span className="font-bold text-purple-800 block mb-0.5">Rationale:</span>
              {changesExplained}
            </div>
          )}

          {/* Anti-Hallucination Guardrail notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-lime-50 border border-lime-200 text-xs text-lime-900">
            <ShieldAlert className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <b>Responsible AI Guardrail:</b> The AI is strictly constrained from fabricating achievements, companies, or credentials. You retain 100% human editorial authority.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-[#ECE5F6] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#5C5572] hover:bg-purple-50 border border-[#ECE5F6] transition-colors"
          >
            Reject Suggestion
          </button>
          <button
            onClick={() => {
              onAccept(editedText);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition-all active:scale-[0.99]"
          >
            <Check className="w-4 h-4" />
            Accept & Apply Bullet
          </button>
        </div>
      </div>
    </div>
  );
}

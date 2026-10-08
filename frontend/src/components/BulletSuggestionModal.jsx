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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 border border-gray-700 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                STAR Bullet Point Improver
              </h3>
              <p className="text-xs text-gray-400">
                Action-oriented, quantified structural refinement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Comparison */}
        <div className="mt-5 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
              Original Phrasing:
            </span>
            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-300 italic">
              "{originalBullet}"
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                STAR Suggestion (Editable by You):
              </span>
              <span className="text-[10px] text-gray-400">Add your exact metrics if available</span>
            </div>
            <textarea
              rows={3}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-900 border border-blue-500/40 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
            />
          </div>

          {/* Explanation of changes */}
          {changesExplained && (
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-gray-300">
              <span className="font-semibold text-blue-400 block mb-0.5">Rationale:</span>
              {changesExplained}
            </div>
          )}

          {/* Anti-Hallucination Guardrail notice */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-[11px] text-gray-400">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <b>Responsible AI Guardrail:</b> The AI is strictly prohibited from fabricating degrees, companies, or credentials. You retain 100% human editorial authority.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-800 border border-gray-700 transition-colors"
          >
            Reject Suggestion
          </button>
          <button
            onClick={() => {
              onAccept(editedText);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            Accept & Apply Bullet
          </button>
        </div>
      </div>
    </div>
  );
}

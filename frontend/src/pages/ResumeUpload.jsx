import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  Check,
  FileCheck
} from 'lucide-react';

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to parse resume document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
          Upload Existing Resume
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Upload your PDF, DOCX, or TXT resume to extract sections, structured evidence, and normalized skills.
        </p>
      </div>

      {/* Upload Zone */}
      {!result ? (
        <form onSubmit={handleUpload} className="glass-panel p-8 rounded-3xl border border-gray-800 space-y-6">
          <div className="border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-2xl p-8 text-center transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
              <Upload className="w-7 h-7" />
            </div>

            <label className="cursor-pointer">
              <span className="font-semibold text-sm text-blue-400 hover:underline">
                Click to browse
              </span>{' '}
              <span className="text-sm text-gray-400">or drag and drop your resume file</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-gray-500 mt-2">
              Supported formats: PDF, DOCX, TXT (Maximum file size: 5MB)
            </p>

            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-200">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {uploading ? 'Extracting & Normalizing Skills...' : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Parse & Ingest Resume</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Parsed Results Overview */
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-heading font-bold text-lg text-white">
                  Resume Successfully Ingested
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Extracted from <span className="text-gray-200">{result.title}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setResult(null)}
                className="px-3.5 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300 border border-gray-700"
              >
                Upload Another
              </button>
              <button
                onClick={() => navigate(`/match?resumeId=${result.id}`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                <span>Evaluate Against Target Job</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metrics & Detected Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-gray-800">
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                ATS Readability Index
              </span>
              <div className="text-3xl font-extrabold font-heading text-emerald-400 mt-2">
                {result.ats_score}%
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Standard single-column parseability and structural completeness.
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-gray-800">
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                Detected Resume Sections
              </span>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {result.detected_sections && Object.entries(result.detected_sections).map(([sec, found]) => (
                  <div key={sec} className="flex items-center gap-1.5 text-gray-300">
                    <span className={`w-2 h-2 rounded-full ${found ? 'bg-emerald-400' : 'bg-gray-600'}`}></span>
                    <span className="capitalize">{sec.replace('_text', '').replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extracted & Normalized Skills */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <h3 className="font-heading font-bold text-base text-white">
              Extracted Skills & Contextual Evidence ({result.extracted_skills?.length || 0})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.extracted_skills?.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-200">{s.canonical_name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      s.evidence_level === 'STRONG' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      s.evidence_level === 'MODERATE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                      'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                      {s.evidence_level} EVIDENCE
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mb-1">
                    Found in: {s.sections_found?.join(', ')}
                  </span>
                  {s.evidence_snippets?.[0] && (
                    <p className="text-[11px] text-gray-400 italic bg-gray-900/40 p-1.5 rounded border border-gray-800/80">
                      "{s.evidence_snippets[0]}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
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
    <div className="max-w-4xl mx-auto space-y-7 animate-fadeIn pb-16">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          Layout-Aware Resume Ingestion
        </div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1E1B2E]">
          Upload Existing Resume
        </h1>
        <p className="text-xs text-[#706886] mt-1">
          Upload your PDF, DOCX, or TXT resume to extract sections, structured evidence, and normalized skills.
        </p>
      </div>

      {/* Upload Zone */}
      {!result ? (
        <form onSubmit={handleUpload} className="bg-white p-7 sm:p-9 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-6">
          <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/50 rounded-3xl p-8 sm:p-12 text-center transition-all">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4 border border-purple-200 shadow-sm">
              <Upload className="w-6 h-6" />
            </div>

            <label className="cursor-pointer">
              <span className="font-semibold text-sm text-purple-700 hover:underline">
                Click to browse
              </span>{' '}
              <span className="text-sm text-[#4B4462]">or drag and drop your resume file</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-[#706886] mt-2 font-medium">
              Supported formats: PDF, DOCX, TXT (Maximum file size: 5MB)
            </p>

            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-900 font-semibold shadow-sm">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 hover:shadow-lg transition-all disabled:opacity-50 active:scale-[0.99]"
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
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-lime-600" />
                <h3 className="font-heading font-extrabold text-lg text-[#1E1B2E]">
                  Resume Successfully Ingested
                </h3>
              </div>
              <p className="text-xs text-[#706886] mt-0.5">
                Extracted from <span className="font-semibold text-[#1E1B2E]">{result.title}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setResult(null)}
                className="px-3.5 py-2 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 text-xs text-[#4B4462] font-semibold border border-[#ECE5F6] transition-colors"
              >
                Upload Another
              </button>
              <button
                onClick={() => navigate('/builder')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold border border-purple-200 transition-colors shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Open in Resume Builder</span>
              </button>
              <button
                onClick={() => navigate(`/match?resumeId=${result.id}`)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all"
              >
                <span>Evaluate Against Target Job</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metrics & Detected Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
              <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">
                ATS Readability Index
              </span>
              <div className="text-3xl font-extrabold font-heading text-lime-700 mt-2">
                {result.ats_score}%
              </div>
              <p className="text-[11px] text-[#706886] mt-1 font-medium">
                Standard single-column parseability and structural completeness.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
              <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">
                Detected Resume Sections
              </span>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {result.detected_sections && Object.entries(result.detected_sections).map(([sec, found]) => (
                  <div key={sec} className="flex items-center gap-2 text-[#332D47] font-medium">
                    <span className={`w-2 h-2 rounded-full ${found ? 'bg-lime-500' : 'bg-slate-300'}`}></span>
                    <span className="capitalize">{sec.replace('_text', '').replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extracted & Normalized Skills */}
          <div className="bg-white p-6 rounded-3xl border border-[#ECE5F6] shadow-saas-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-[#1E1B2E]">
              Extracted Skills & Contextual Evidence ({result.extracted_skills?.length || 0})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.extracted_skills?.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[#1E1B2E]">{s.canonical_name}</span>
                    <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                      s.evidence_level === 'STRONG' ? 'bg-lime-50 text-lime-800 border border-lime-200' :
                      s.evidence_level === 'MODERATE' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                      'bg-purple-50 text-purple-800 border border-purple-200'
                    }`}>
                      {s.evidence_level} EVIDENCE
                    </span>
                  </div>
                  <span className="text-[10px] text-[#706886] font-medium block mb-1">
                    Found in: {s.sections_found?.join(', ')}
                  </span>
                  {s.evidence_snippets?.[0] && (
                    <p className="text-[11px] text-[#4B4462] italic bg-white p-2 rounded-xl border border-[#ECE5F6]">
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

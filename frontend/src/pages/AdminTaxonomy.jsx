import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Shield, 
  Users, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Search, 
  Check, 
  GraduationCap,
  Sparkles
} from 'lucide-react';

export default function AdminTaxonomy() {
  const [metrics, setMetrics] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // New skill form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Frameworks');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillAliases, setNewSkillAliases] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  const categories = [
    'Programming Languages',
    'Frameworks',
    'Libraries',
    'Databases',
    'Cloud',
    'DevOps',
    'Tools',
    'Data/Analytics',
    'AI/ML',
    'Cybersecurity',
    'Domain Skills',
    'Soft Skills'
  ];

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [metricsRes, skillsRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/skills?limit=200')
      ]);
      setMetrics(metricsRes.data);
      setSkills(skillsRes.data);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSkill = async (e) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      await api.post('/admin/skills', {
        canonical_name: newSkillName,
        category: newSkillCategory,
        description: newSkillDesc,
        aliases: newSkillAliases.split(',').map(a => a.trim()).filter(Boolean)
      });
      setCreateMsg('Canonical skill registered successfully!');
      setNewSkillName('');
      setNewSkillDesc('');
      setNewSkillAliases('');
      fetchAdminData();
      setTimeout(() => setCreateMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create skill.");
    }
  };

  const handleDeleteSkill = async (id) => {
    if (!window.confirm("Delete this canonical skill from taxonomy?")) return;
    try {
      await api.delete(`/admin/skills/${id}`);
      fetchAdminData();
    } catch (err) {
      alert("Failed to delete skill.");
    }
  };

  const filteredSkills = skills.filter(s => 
    s.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 animate-fadeIn pb-16">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold mb-2">
          <Shield className="w-3.5 h-3.5 text-purple-600" />
          University Placement & Admin Portal
        </div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1E1B2E]">
          Mentor Insights & Taxonomy Management
        </h1>
        <p className="text-xs text-[#706886] mt-0.5">
          Monitor cohort ATS readiness, track candidate gaps across graduating batches, and manage canonical technology taxonomies.
        </p>
      </div>

      {/* Cohort Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
          <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">Total Candidates</span>
          <div className="text-3xl font-extrabold font-heading text-[#1E1B2E] mt-2">
            {metrics?.cohort_overview?.total_candidates || 0}
          </div>
          <span className="text-[11px] text-[#706886] font-medium">Registered users</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
          <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">Cohort Resumes</span>
          <div className="text-3xl font-extrabold font-heading text-purple-700 mt-2">
            {metrics?.cohort_overview?.total_resumes_generated || 0}
          </div>
          <span className="text-[11px] text-[#706886] font-medium">Ingested or built</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
          <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">Evaluations Run</span>
          <div className="text-3xl font-extrabold font-heading text-sky-700 mt-2">
            {metrics?.cohort_overview?.total_evaluations_run || 0}
          </div>
          <span className="text-[11px] text-[#706886] font-medium">Target job analyses</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#ECE5F6] shadow-saas-sm">
          <span className="text-xs uppercase font-bold text-[#706886] tracking-wider">Average Match Index</span>
          <div className="text-3xl font-extrabold font-heading text-lime-700 mt-2">
            {metrics?.cohort_overview?.cohort_average_match_score || 0}%
          </div>
          <span className="text-[11px] text-[#706886] font-medium">Batch mean fit score</span>
        </div>
      </div>

      {/* Placement Insights: Top Missing Skills */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              Cohort Skill Gap Trends (Placement Insights)
            </h3>
            <p className="text-xs text-[#706886] mt-0.5">
              The most frequent missing skills detected across candidate evaluations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {metrics?.placement_insights?.top_cohort_skill_gaps?.map((gap, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#1E1B2E] block">{gap.skill_name}</span>
                <span className="text-[10px] text-[#706886] font-medium">{gap.category}</span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                {gap.frequency} candidates
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Taxonomy Manager: Create Skill */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-[#1E1B2E] flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            Register Canonical Skill in Taxonomy
          </h3>
          {createMsg && (
            <span className="text-xs text-lime-800 bg-lime-50 border border-lime-200 px-3 py-1 rounded-full flex items-center gap-1 font-semibold">
              <Check className="w-3.5 h-3.5" /> {createMsg}
            </span>
          )}
        </div>

        <form onSubmit={handleCreateSkill} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Canonical Skill Name (e.g. SvelteKit)"
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
            />
            <select
              value={newSkillCategory}
              onChange={e => setNewSkillCategory(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white font-medium"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="Aliases (comma-separated, e.g. svelte kit, svelte-kit)"
              value={newSkillAliases}
              onChange={e => setNewSkillAliases(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all active:scale-[0.99]"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Skill & Aliases
            </button>
          </div>
        </form>
      </div>

      {/* Taxonomy Browser */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ECE5F6] shadow-saas space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading font-bold text-base text-[#1E1B2E]">
            Active Skill Taxonomy Catalog ({filteredSkills.length})
          </h3>

          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter canonical skills or categories..."
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filteredSkills.map(s => (
            <div key={s.id} className="p-3.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] flex items-start justify-between text-xs hover:border-purple-300 transition-colors">
              <div>
                <span className="font-bold text-[#1E1B2E] block">{s.canonical_name}</span>
                <span className="text-[10px] text-purple-700 font-semibold block">{s.category}</span>
                {s.aliases && s.aliases.length > 0 && (
                  <span className="text-[10px] text-[#706886] italic block mt-1">
                    Aliases: {s.aliases.map(a => a.alias_name).join(', ')}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDeleteSkill(s.id)}
                className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                title="Remove skill"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

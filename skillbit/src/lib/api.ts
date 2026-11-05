const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8000/api"

export const TOKEN_KEY = "token"

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore storage errors
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (err) {
    // Fallback to relative /api proxy if direct localhost:8000 is blocked
    res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    })
  }

  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const errJson = await res.json()
      if (errJson?.detail) {
        detail =
          typeof errJson.detail === "string"
            ? errJson.detail
            : JSON.stringify(errJson.detail)
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(detail)
  }

  return res.json() as Promise<T>
}

/* ------------------------------------------------------------------ */
/* Backend API Types                                                   */
/* ------------------------------------------------------------------ */

export interface BackendTokenResponse {
  access_token: string
  token_type: string
  user_id: string
  email: string
  full_name?: string
  role: string
  picture?: string
}

export interface BackendUserResponse {
  id: string
  email: string
  full_name?: string
  role: string
  is_active: boolean
  picture?: string
  created_at: string
}

export interface BackendEducation {
  id: string
  institution: string
  degree: string
  field_of_study?: string | null
  start_date?: string | null
  end_date?: string | null
  gpa?: string | null
  honors?: string | null
}

export interface BackendExperience {
  id: string
  company: string
  role_title: string
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  is_current: boolean
  bullets: string[]
  technologies?: string[]
}

export interface BackendProject {
  id: string
  title: string
  description?: string | null
  role?: string | null
  technologies: string[]
  repo_url?: string | null
  live_url?: string | null
}

export interface BackendUserSkill {
  id: string
  skill_id: string
  skill_name?: string | null
  category?: string | null
  proficiency: string
  years_experience?: number | null
  verified_by_resume: boolean
}

export interface BackendProfileResponse {
  id: string
  user_id: string
  headline?: string | null
  summary?: string | null
  phone?: string | null
  location?: string | null
  linkedin_url?: string | null
  github_url?: string | null
  portfolio_url?: string | null
  created_at: string
  updated_at: string
  educations: BackendEducation[]
  experiences: BackendExperience[]
  projects: BackendProject[]
  user_skills: BackendUserSkill[]
}

export interface BackendSkillAlias {
  id: string
  alias_name: string
}

export interface BackendSkill {
  id: string
  canonical_name: string
  category: string
  description?: string | null
  aliases: BackendSkillAlias[]
}

export interface BackendNormalizedSkill {
  original_text: string
  canonical_name: string
  category: string
  match_type: string
  confidence: number
}

export interface BackendExtractedSkill {
  skill_id: string
  canonical_name: string
  category: string
  evidence_level: "STRONG" | "MODERATE" | "LISTED" | "MENTIONED"
  evidence_snippets: string[]
  sections_found: string[]
  mention_count?: number
}

export interface BackendResume {
  id: string
  user_id: string
  title: string
  source_type: string
  file_path?: string | null
  raw_text?: string | null
  structured_json: Record<string, any>
  ats_score?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BackendResumeUploadResponse extends BackendResume {
  extracted_skills: BackendExtractedSkill[]
  detected_sections: Record<string, boolean>
  generated_profile: Record<string, any>
  is_exact_profile_match: boolean
  existing_resume_id?: string | null
  existing_profile_title?: string | null
  profile_match_message?: string | null
}

export interface BackendRepoAnalysis {
  title: string
  repo_url: string
  description?: string
  technologies: string[]
  bullets: string[]
  stars?: number | null
  language?: string | null
}

export interface BackendAutoFormatResponse {
  structured_json: Record<string, any>
  fixes_applied: string[]
  provider_used: string
}

export interface BackendJobSkill {
  id: string
  skill_id: string
  skill_name: string
  category: string
  importance: "REQUIRED" | "PREFERRED"
  weight: number
  context_snippet?: string | null
}

export interface BackendJobDescription {
  id: string
  user_id: string
  title: string
  company?: string | null
  seniority_level?: string | null
  raw_text: string
  created_at: string
  job_skills: BackendJobSkill[]
}

export interface BackendSkillGap {
  id?: string
  skill_id: string
  skill_name: string
  category: string
  importance: "REQUIRED" | "PREFERRED"
  gap_status: "STRONG_MATCH" | "PARTIAL_MATCH" | "WEAK_EVIDENCE" | "MISSING"
  priority: "HIGH" | "MEDIUM" | "LOW"
  resume_evidence?: string | null
  job_requirement_snippet?: string | null
  reason: string
}

export interface BackendAiInsights {
  readiness_level:
    | "Interview Ready"
    | "Near Match (Minor Gaps)"
    | "Core Upskilling Required"
  readiness_pill_color?: string
  executive_summary: string
  top_improvement_priorities: string[]
  strategic_action_plan: string[]
  provider_used?: string
}

export interface BackendMatchAnalysis {
  id: string
  user_id: string
  resume_id: string
  job_id: string
  job_title: string
  company?: string | null
  overall_score: number
  exact_match_score: number
  semantic_score: number
  experience_score: number
  matched_count: number
  total_job_skills: number
  summary_notes?: string | null
  ai_insights?: BackendAiInsights | null
  disclaimer: string
  created_at: string
  gaps: BackendSkillGap[]
}

export interface BackendMatchHistoryItem {
  id: string
  resume_id: string
  job_id: string
  job_title: string
  company?: string | null
  resume_title?: string | null
  overall_score: number
  exact_match_score?: number | null
  semantic_score?: number | null
  experience_score?: number | null
  created_at: string
}

export interface BackendRoadmapStage {
  stage_number: number
  stage_title: string
  estimated_duration: string
  topics_in_sequence: string[]
  practice_milestone: string
  doc_url?: string
}

export interface BackendRecommendation {
  id?: string
  skill_id: string
  skill_name: string
  gap_status: string
  priority: string
  learning_topic: string
  concepts: string[]
  learning_path?: BackendRoadmapStage[] | null
  practice_project?: string | null
  certification_name?: string | null
  suggested_resume_bullet?: string | null
  action_plan?: string | null
  resource_url?: string | null
}

export interface BackendCustomRoadmapResponse {
  skill_name: string
  target_role: string
  total_stages: number
  estimated_total_time: string
  provider: string
  learning_path: BackendRoadmapStage[]
}

export interface BackendBulletSuggestionResponse {
  original_bullet: string
  suggested_bullet: string
  methodology: string
  changes_explained: string
  is_editable: boolean
  review_prompt: string
}

export interface BackendQualityIndicator {
  label: string
  status: "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT"
  score: number
  message: string
}

export interface BackendDashboardResponse {
  user_name?: string
  resume_count: number
  active_resume_id?: string | null
  active_resume_title?: string | null
  resume_completeness_pct: number
  overall_quality_score: number
  quality_indicators: BackendQualityIndicator[]
  recent_analyses: {
    id: string
    job_title: string
    company?: string
    overall_score: number
    created_at: string
  }[]
  top_strengths: string[]
  top_critical_gaps: {
    skill_name: string
    category: string
    gap_status: string
    reason: string
  }[]
  skill_category_distribution: Record<string, number>
  recommendations_count: number
}

export interface BackendAdminMetrics {
  cohort_overview: {
    total_candidates: number
    total_resumes_generated: number
    total_evaluations_run: number
    cohort_average_match_score: number
  }
  placement_insights: {
    top_cohort_skill_gaps: {
      skill_name: string
      category: string
      frequency: number
    }[]
    curriculum_recommendation: string
  }
  taxonomy_stats: Record<string, number>
  registered_users?: {
    id: string
    name: string
    email: string
    role: string
    provider: "email" | "google"
    created_at?: string
  }[]
  live_candidates?: {
    id: string
    name: string
    email: string
    program: string
    role: string
    fit: number
    missing: string[]
    analyses: number
    live: boolean
  }[]
}

/* ------------------------------------------------------------------ */
/* API Functions                                                       */
/* ------------------------------------------------------------------ */

export const api = {
  getToken,
  setToken,
  // Auth
  getAuthConfig: () => request<{ google_client_id: string }>("/auth/config"),
  login: (email: string, password: string) =>
    request<BackendTokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    }),
  register: (full_name: string, email: string, password: string) =>
    request<BackendUserResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    }),
  googleLogin: (payload: {
    credential?: string
    email?: string
    full_name?: string
    picture?: string
  }) =>
    request<BackendTokenResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMe: () => request<BackendUserResponse>("/auth/me"),
  verifyOtp: (email: string, otp: string) =>
    request<BackendTokenResponse>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    }),
  verifyEmail: (token: string) =>
    request<BackendTokenResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  resendVerification: (email: string) =>
    request<{ status: string; message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    }),
  getSmtpStatus: () =>
    request<{ configured: boolean; status: string; message?: string }>(
      "/auth/smtp-status",
    ),
  sendTestEmail: (to_email?: string) =>
    request<{ status: string; message: string }>(
      `/auth/test-email${to_email ? `?to_email=${encodeURIComponent(to_email)}` : ""}`,
      { method: "POST" },
    ),
  changePassword: (current_password: string, new_password: string) =>
    request<{ status: string; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Profile
  getProfile: () => request<BackendProfileResponse>("/profile"),
  updateProfile: (data: {
    headline?: string | null
    summary?: string | null
    phone?: string | null
    location?: string | null
    linkedin_url?: string | null
    github_url?: string | null
    portfolio_url?: string | null
  }) =>
    request<BackendProfileResponse>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  syncProfileFromResume: (params?: {
    resume_id?: string
    replace?: boolean
    profile_title?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.resume_id) q.set("resume_id", params.resume_id)
    if (params?.replace !== undefined) q.set("replace", String(params.replace))
    if (params?.profile_title) q.set("profile_title", params.profile_title)
    const qs = q.toString()
    return request<BackendProfileResponse>(
      `/profile/sync-from-resume${qs ? `?${qs}` : ""}`,
      { method: "POST" },
    )
  },
  addProfileExperience: (data: {
    company: string
    role_title: string
    location?: string
    start_date?: string
    end_date?: string
    is_current?: boolean
    bullets: string[]
    technologies?: string[]
  }) =>
    request<BackendExperience>("/profile/experience", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteProfileExperience: (id: string) =>
    request<void>(`/profile/experience/${id}`, { method: "DELETE" }),
  addProfileEducation: (data: {
    institution: string
    degree: string
    field_of_study?: string
    start_date?: string
    end_date?: string
    gpa?: string
    honors?: string
  }) =>
    request<BackendEducation>("/profile/education", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteProfileEducation: (id: string) =>
    request<void>(`/profile/education/${id}`, { method: "DELETE" }),
  addProfileProject: (data: {
    title: string
    description?: string
    technologies?: string[]
    repo_url?: string
    live_url?: string
  }) =>
    request<BackendProject>("/profile/project", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteProfileProject: (id: string) =>
    request<void>(`/profile/project/${id}`, { method: "DELETE" }),
  addProfileSkill: (data: {
    skill_id: string
    proficiency: string
    years_experience?: number
  }) =>
    request<BackendUserSkill>("/profile/skill", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteProfileSkill: (id: string) =>
    request<void>(`/profile/skill/${id}`, { method: "DELETE" }),

  // Skills & Taxonomy
  getSkills: (params?: { query?: string; category?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.query) q.set("query", params.query)
    if (params?.category) q.set("category", params.category)
    q.set("limit", String(params?.limit ?? 500))
    return request<BackendSkill[]>(`/skills?${q.toString()}`)
  },
  getSkillCategories: () =>
    request<
      Record<string, { id: string; name: string; description?: string }[]>
    >("/skills/categories"),
  normalizeSkills: (skillNames: string[]) =>
    request<BackendNormalizedSkill[]>("/skills/normalize", {
      method: "POST",
      body: JSON.stringify(skillNames),
    }),

  // Resume
  uploadResume: (file: File, title?: string) => {
    const fd = new FormData()
    fd.append("file", file)
    if (title) fd.append("title", title)
    return request<BackendResumeUploadResponse>("/resume/upload", {
      method: "POST",
      body: fd,
    })
  },
  createResume: (title: string, structured_json: Record<string, any>) =>
    request<BackendResume>("/resume/create", {
      method: "POST",
      body: JSON.stringify({ title, structured_json }),
    }),
  getResumes: () => request<BackendResume[]>("/resume"),
  getResumeById: (id: string) => request<BackendResume>(`/resume/${id}`),
  updateResume: (
    id: string,
    title: string,
    structured_json: Record<string, any>,
  ) =>
    request<BackendResume>(`/resume/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, structured_json }),
    }),
  deleteResume: (id: string) =>
    request<void>(`/resume/${id}`, { method: "DELETE" }),
  exportResumePdf: async (id: string, filename = "resume_ATS.pdf") => {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers["Authorization"] = `Bearer ${token}`
    let res: Response
    try {
      res = await fetch(`${API_BASE_URL}/resume/${id}/export`, { headers })
    } catch {
      res = await fetch(`/api/resume/${id}/export`, { headers })
    }
    if (!res.ok) throw new Error("Failed to export PDF from server")
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  },
  analyzeRepo: (repo_url: string, project_title?: string) =>
    request<BackendRepoAnalysis>("/resume/analyze-repo", {
      method: "POST",
      body: JSON.stringify({ repo_url, project_title }),
    }),
  autoFormatResume: (payload: {
    structured_json?: Record<string, any>
    raw_messy_text?: string | null
    target_role?: string
  }) =>
    request<BackendAutoFormatResponse>("/resume/auto-format", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Job
  analyzeJob: (payload: { title: string; company?: string; raw_text: string }) =>
    request<BackendJobDescription>("/job/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getJobs: () => request<BackendJobDescription[]>("/job"),
  getJobById: (id: string) => request<BackendJobDescription>(`/job/${id}`),
  deleteJob: (id: string) => request<void>(`/job/${id}`, { method: "DELETE" }),

  // Match
  getLlmProvider: () =>
    request<{
      provider: string
      model: string
      is_mock: boolean
      name: string
    }>("/match/llm-provider"),
  analyzeMatch: (resume_id: string, job_id: string) =>
    request<BackendMatchAnalysis>("/match/analyze", {
      method: "POST",
      body: JSON.stringify({ resume_id, job_id }),
    }),
  getMatchHistory: () => request<BackendMatchHistoryItem[]>("/match/history"),
  getAnalysisById: (id: string) =>
    request<BackendMatchAnalysis>(`/match/${id}`),
  deleteAnalysis: (id: string) =>
    request<void>(`/match/${id}`, { method: "DELETE" }),
  refreshAiInsights: (analysis_id: string) =>
    request<BackendAiInsights>(`/match/${analysis_id}/ai-insights`, {
      method: "POST",
    }),

  // Recommendations & STAR Bullets
  getRecommendations: (analysis_id: string) =>
    request<BackendRecommendation[]>(`/recommendations/${analysis_id}`),
  generateCustomRoadmap: (payload: {
    skill_name: string
    target_role?: string
    candidate_level?: string
  }) =>
    request<BackendCustomRoadmapResponse>("/recommendations/generate-roadmap", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  suggestBullets: (payload: {
    raw_bullet: string
    target_skill?: string
    role_context?: string
  }) =>
    request<BackendBulletSuggestionResponse>("/resume/suggest-bullets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Dashboard
  getDashboard: () => request<BackendDashboardResponse>("/dashboard"),

  // Admin
  getAdminMetrics: () => request<BackendAdminMetrics>("/admin/metrics"),
  adminCreateSkill: (payload: {
    canonical_name: string
    category: string
    description?: string
    aliases: string[]
  }) =>
    request<BackendSkill>("/admin/skills", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminDeleteSkill: (skill_id: string) =>
    request<void>(`/admin/skills/${skill_id}`, { method: "DELETE" }),

  // AI Job Discovery & Recommendation Engine
  getDiscoverySources: () =>
    request<BackendJobSource[]>("/discovery/sources"),
  getCandidateContext: () =>
    request<BackendCandidateProfileSnapshot>("/discovery/candidate-context"),
  rebuildCandidateContext: () =>
    request<BackendCandidateProfileSnapshot>("/discovery/candidate-context/rebuild", {
      method: "POST",
    }),
  getJobPreferences: () =>
    request<BackendUserJobPreferences>("/discovery/preferences"),
  updateJobPreferences: (payload: Partial<BackendUserJobPreferences>) =>
    request<BackendUserJobPreferences>("/discovery/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  startJobDiscoverySearch: (payload?: {
    custom_queries?: string[]
    preferred_sources?: string[]
    force_refresh_profile?: boolean
    run_in_background?: boolean
  }) =>
    request<BackendJobSearchRun>("/discovery/search", {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  getJobSearchStatus: (searchRunId: string) =>
    request<BackendJobSearchRun>(`/discovery/search/${searchRunId}`),
  cancelJobSearch: (searchRunId: string) =>
    request<BackendJobSearchRun>(`/discovery/search/${searchRunId}/cancel`, {
      method: "POST",
    }),
  getJobSearchHistory: () =>
    request<BackendJobSearchRun[]>("/discovery/search-history"),
  getJobRecommendations: (params?: {
    category_tab?: string
    role?: string
    skill?: string
    location?: string
    work_arrangement?: string
    employment_type?: string
    experience_level?: string
    min_salary?: number
    company?: string
    industry?: string
    source?: string
    min_match_score?: number
    application_status?: string
    resume_id?: string
    include_dismissed?: boolean
  }) => {
    const q = new URLSearchParams()
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          q.set(k, String(v))
        }
      }
    }
    const qs = q.toString()
    return request<BackendJobRecommendation[]>(
      `/discovery/recommendations${qs ? `?${qs}` : ""}`,
    )
  },
  getJobRecommendationDetail: (jobId: string) =>
    request<BackendJobRecommendation>(`/discovery/jobs/${jobId}`),
  getJobExplanation: (jobId: string, refreshLlm = false) =>
    request<BackendJobRecommendation>(
      `/discovery/jobs/${jobId}/explanation?refresh_llm=${refreshLlm}`,
    ),
  verifyJobListing: (jobId: string, liveCheck = false) =>
    request<BackendJobListing>(
      `/discovery/jobs/${jobId}/verify?live_check=${liveCheck}`,
      { method: "POST" },
    ),
  saveJob: (jobId: string, notes?: string) =>
    request<BackendSavedJob>(`/discovery/jobs/${jobId}/save`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
  unsaveJob: (jobId: string) =>
    request<void>(`/discovery/jobs/${jobId}/save`, {
      method: "DELETE",
    }),
  getSavedJobs: () => request<BackendSavedJob[]>("/discovery/saved"),
  dismissJobRecommendation: (jobId: string) =>
    request<BackendJobRecommendation>(`/discovery/jobs/${jobId}/dismiss`, {
      method: "POST",
    }),
  undismissJobRecommendation: (jobId: string) =>
    request<BackendJobRecommendation>(`/discovery/jobs/${jobId}/undismiss`, {
      method: "POST",
    }),
  applyToJob: (
    jobId: string,
    payload?: {
      resume_id?: string
      status?: string
      applied_via_url?: string
      notes?: string
    },
  ) =>
    request<BackendJobApplication>(`/discovery/jobs/${jobId}/apply`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  getJobApplications: () =>
    request<BackendJobApplication[]>("/discovery/applications"),
}

/* ------------------------------------------------------------------ */
/* Job Discovery & Recommendation Types                                */
/* ------------------------------------------------------------------ */

export interface BackendJobSource {
  id: string
  slug: string
  name: string
  category: string
  integration_mode: string
  base_url?: string | null
  requires_api_key: boolean
  api_key_env_var?: string | null
  api_key_configured: boolean
  is_enabled: boolean
  rate_limit_rpm: number
  description?: string | null
}

export interface BackendJobSourceEvidence {
  id?: string
  source_slug: string
  source_name: string
  source_category: string
  source_url: string
  original_post_excerpt?: string | null
  discovered_via_query?: string | null
  verified_at?: string | null
}

export interface BackendJobListing {
  id: string
  canonical_fingerprint: string
  title: string
  company: string
  company_website?: string | null
  original_url: string
  application_url: string
  primary_source: string
  source_category: string
  original_post_excerpt?: string | null
  description: string
  required_skills: string[]
  preferred_skills: string[]
  education_requirements?: string | null
  experience_requirements?: string | null
  min_experience_years?: number | null
  seniority_level: string
  employment_type: string
  is_internship: boolean
  is_fresher_friendly: boolean
  location?: string | null
  work_arrangement: string
  salary_text?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  industry?: string | null
  is_startup: boolean
  published_at?: string | null
  application_deadline?: string | null
  availability_status: string
  last_verified_at?: string | null
  discovered_at?: string | null
  source_evidences: BackendJobSourceEvidence[]
}

export interface BackendResumeComparisonItem {
  resume_id: string
  resume_title: string
  match_score: number
  matched_required_skills: string[]
  matched_preferred_skills: string[]
  strong_evidence_count: number
  reason: string
}

export interface BackendJobRecommendation {
  id: string
  user_id: string
  job_listing_id: string
  search_run_id?: string | null
  match_score: number
  score_breakdown: Record<string, number>
  eligibility_status: string
  eligibility_reasons: string[]
  strong_matching_skills: string[]
  partially_matching_skills: string[]
  missing_skills: string[]
  relevant_projects: string[]
  education_compatibility?: string | null
  experience_compatibility?: string | null
  why_recommended: string
  potential_concerns: string[]
  preparation_steps: string[]
  best_resume_id?: string | null
  best_resume_title?: string | null
  best_resume_reason?: string | null
  resume_comparison: BackendResumeComparisonItem[]
  category_tags: string[]
  is_dismissed: boolean
  is_saved: boolean
  application_status?: string | null
  applied_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  job: BackendJobListing
}

export interface BackendJobSearchRun {
  id: string
  user_id: string
  status: string
  current_stage: number
  current_stage_label: string
  progress_pct: number
  generated_queries: string[]
  sources_queried: {
    source: string
    slug?: string
    status: string
    jobs_found: number
    message?: string
  }[]
  total_discovered: number
  duplicates_consolidated: number
  recommendations_created: number
  cancel_requested: boolean
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
}

export interface BackendUserJobPreferences {
  id: string
  user_id: string
  preferred_roles: string[]
  alternative_roles: string[]
  preferred_locations: string[]
  remote_only: boolean
  work_arrangements: string[]
  employment_types: string[]
  internship_preference: string
  preferred_industries: string[]
  min_match_score: number
  salary_min?: number | null
  salary_max?: number | null
  salary_currency: string
  excluded_companies: string[]
  excluded_categories: string[]
  preferred_sources: string[]
  search_frequency: string
  scoring_weights: Record<string, number>
  consent_external_llm: boolean
  override_inferred_roles: boolean
  updated_at?: string | null
}

export interface BackendCandidateProfileSnapshot {
  id: string
  user_id: string
  snapshot_version: number
  unified_profile_json: Record<string, any>
  resume_conflicts_json: {
    type: string
    entity: string
    field: string
    values: { source: string; value: string }[]
    resolution: string
  }[]
  source_attribution_json: Record<string, string[]>
  resume_count_analyzed: number
  updated_at?: string | null
}

export interface BackendSavedJob {
  id: string
  user_id: string
  job_listing_id: string
  notes?: string | null
  created_at?: string | null
  job: BackendJobListing
  match_score?: number | null
}

export interface BackendJobApplication {
  id: string
  user_id: string
  job_listing_id: string
  resume_id?: string | null
  resume_title?: string | null
  status: string
  applied_via_url?: string | null
  notes?: string | null
  applied_at?: string | null
  updated_at?: string | null
  job: BackendJobListing
  match_score?: number | null
}

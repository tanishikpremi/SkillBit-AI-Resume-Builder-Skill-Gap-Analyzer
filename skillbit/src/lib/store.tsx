import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  matchResume,
  parseJob,
  parseResume,
  type Evidence,
  type MatchResult,
  type ParsedJob,
  type ParsedResume,
  type SkillGap,
} from "./engine"
import { BASE_TAXONOMY, CATEGORIES, type Category, type Skill } from "./taxonomy"
import { SAMPLE_JOB, SAMPLE_RESUME } from "./sample"
import {
  api,
  getToken,
  setToken,
  type BackendAdminMetrics,
  type BackendDashboardResponse,
  type BackendJobDescription,
  type BackendMatchAnalysis,
  type BackendProfileResponse,
  type BackendRecommendation,
  type BackendResume,
  type BackendResumeUploadResponse,
  type BackendSkill,
} from "./api"

export type Role = "user" | "admin"
export interface User {
  id: string
  name: string
  email: string
  role: Role
  provider: "email" | "google"
  createdAt: number
  picture?: string
}
interface StoredUser extends User {
  password: string
}

export interface ResumeDoc {
  id: string
  title: string
  source: "uploaded" | "builder" | "pasted"
  fileName?: string
  text: string
  parsed: ParsedResume
  createdAt: number
  structured?: Record<string, any>
  generatedProfile?: Record<string, any>
  isExactProfileMatch?: boolean
  existingResumeId?: string
  existingProfileTitle?: string
  profileMatchMessage?: string
}

export interface AnalysisDoc {
  id: string
  resumeId: string
  resumeTitle: string
  jobId?: string
  jobTitle: string
  company: string
  jobText: string
  job: ParsedJob
  result: MatchResult
  createdAt: number
  matchedCount?: number
  totalJobSkills?: number
  disclaimer?: string
}

export interface Profile {
  headline: string
  location: string
  phone?: string
  summary: string
  targetRole: string
  linkedin: string
  github: string
  website: string
}

export interface Entry {
  id: string
  title: string
  org: string
  period: string
  location?: string
  employmentType?: string
  gpa?: string
  honors?: string
  link?: string
  liveUrl?: string
  bullets: string[]
}

export interface BuilderDraft {
  activeResumeId?: string
  title?: string
  name: string
  designation?: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  portfolio?: string
  customLinks?: { label: string; url: string }[]
  summary: string
  skills: string
  skillCategories?: { category: string; skills: string[] }[]
  skillsDisplayMode?: "rows" | "table"
  experience: Entry[]
  projects: Entry[]
  education: Entry[]
  customTables?: { title: string; headers: string[]; rows: string[][] }[]
  certifications?: { name: string; issuer: string; date: string; url: string }[]
  languages?: { language: string; proficiency: string }[]
  styleSettings?: {
    font_family: "sans" | "serif" | "mono" | "calibri"
    font_size: "compact" | "standard" | "comfortable"
    line_spacing: "tight" | "normal" | "relaxed"
    accent_color: string
  }
}

export interface RoadmapEntry {
  skill: string
  role: string
  createdAt: number
}

export interface UserData {
  resumes: ResumeDoc[]
  analyses: AnalysisDoc[]
  jobs?: BackendJobDescription[]
  profile: Profile
  masterProfile?: BackendProfileResponse | null
  dashboard?: BackendDashboardResponse | null
  recommendationsBySkill?: Record<string, BackendRecommendation>
  llmProvider?: string
  progress: Record<string, string[]>
  roadmaps: RoadmapEntry[]
  draft: BuilderDraft
}

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

const USERS_KEY = "skillbit:users"
const SESSION_KEY = "skillbit:session"
const TAX_KEY = "skillbit:taxonomy-custom"
const dataKey = (id: string) => `skillbit:data:${id}`

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

const DEMO_USERS: StoredUser[] = [
  {
    id: "demo",
    name: "Maya Chen",
    email: "demo@skillbit.ai",
    password: "demo1234",
    role: "user",
    provider: "email",
    createdAt: Date.now() - 864e5 * 30,
  },
  {
    id: "admin",
    name: "Placement Office",
    email: "admin@skillbit.ai",
    password: "admin1234",
    role: "admin",
    provider: "email",
    createdAt: Date.now() - 864e5 * 90,
  },
]

function allUsers(): StoredUser[] {
  const stored = read<StoredUser[]>(USERS_KEY, [])
  const ids = new Set(stored.map((u) => u.email))
  return [...DEMO_USERS.filter((d) => !ids.has(d.email)), ...stored]
}

export const emptyDraft = (name = "", email = ""): BuilderDraft => ({
  title: name ? `${name} — Resume` : "Professional Resume",
  name,
  designation: "Senior Full-Stack Software Engineer",
  email,
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  customLinks: [],
  summary: "",
  skills: "",
  skillCategories: [],
  skillsDisplayMode: "rows",
  experience: [{ id: uid(), title: "", org: "", period: "", bullets: [""] }],
  projects: [],
  education: [{ id: uid(), title: "", org: "", period: "", bullets: [] }],
  customTables: [],
  certifications: [],
  languages: [],
  styleSettings: {
    font_family: "sans",
    font_size: "standard",
    line_spacing: "normal",
    accent_color: "#1E3A8A",
  },
})

/* ------------------------------------------------------------------ */
/* Backend <-> Frontend Mappers                                        */
/* ------------------------------------------------------------------ */

export function mapCategory(cat?: string | null): Category {
  if (!cat) return "Programming Languages"
  if ((CATEGORIES as string[]).includes(cat)) return cat as Category
  const low = cat.toLowerCase()
  if (low.includes("lang")) return "Programming Languages"
  if (low.includes("framework")) return "Frameworks"
  if (low.includes("lib")) return "Libraries"
  if (low.includes("data") && low.includes("base")) return "Databases"
  if (low.includes("devops") || low.includes("container"))
    return "DevOps & Containers"
  if (low.includes("ai") || low.includes("ml") || low.includes("machine"))
    return "AI / Machine Learning"
  if (low.includes("analytic") || low.includes("data")) return "Data & Analytics"
  if (low.includes("domain") || low.includes("se") || low.includes("arch"))
    return "Domain / SE Skills"
  if (low.includes("soft")) return "Soft Skills"
  if (low.includes("tool")) return "Developer Tools"
  if (low.includes("cyber") || low.includes("sec")) return "Cybersecurity"
  if (low.includes("cloud")) return "Cloud Platforms"
  return "Programming Languages"
}

export function structuredToText(s: Record<string, any>, fallbackTitle = ""): string {
  if (s.raw_text && typeof s.raw_text === "string" && s.raw_text.trim()) {
    return s.raw_text
  }
  const contact = s.contact_info || {}
  const lines: string[] = [
    s.full_name || contact.full_name || fallbackTitle || "Candidate",
    [
      contact.email,
      contact.phone,
      contact.location,
      contact.linkedin,
      contact.github,
      contact.portfolio || s.portfolio,
    ]
      .filter(Boolean)
      .join(" | "),
    "",
  ]
  if (s.summary) {
    lines.push("SUMMARY", String(s.summary).trim(), "")
  }
  const exps = s.experiences || s.experience || []
  if (Array.isArray(exps) && exps.length > 0) {
    lines.push("EXPERIENCE")
    for (const e of exps) {
      const period = [e.start_date, e.is_current ? "Present" : e.end_date]
        .filter(Boolean)
        .join(" – ")
      lines.push(
        [e.role_title || e.title, e.company || e.org].filter(Boolean).join(" — ") +
          (period ? ` (${period})` : ""),
      )
      for (const b of e.bullets || []) {
        if (String(b).trim()) lines.push(`- ${String(b).trim()}`)
      }
    }
    lines.push("")
  } else if (s.experience_raw) {
    lines.push("EXPERIENCE", String(s.experience_raw).trim(), "")
  }

  const projs = s.projects || []
  if (Array.isArray(projs) && projs.length > 0) {
    lines.push("PROJECTS")
    for (const p of projs) {
      const techs = Array.isArray(p.technologies)
        ? p.technologies.join(", ")
        : p.technologies || p.org || ""
      lines.push(
        [p.title, techs].filter(Boolean).join(" — ") +
          (p.date ? ` (${p.date})` : ""),
      )
      if (p.repo_url) lines.push(String(p.repo_url))
      for (const b of p.bullets || (p.description ? [p.description] : [])) {
        if (String(b).trim()) lines.push(`- ${String(b).trim()}`)
      }
    }
    lines.push("")
  } else if (s.projects_raw) {
    lines.push("PROJECTS", String(s.projects_raw).trim(), "")
  }

  const edus = s.educations || s.education || []
  if (Array.isArray(edus) && edus.length > 0) {
    lines.push("EDUCATION")
    for (const ed of edus) {
      const deg = [ed.degree, ed.field_of_study].filter(Boolean).join(" in ")
      const period = [ed.start_date, ed.end_date].filter(Boolean).join(" – ")
      lines.push(
        [deg || ed.title, ed.institution || ed.org].filter(Boolean).join(" — ") +
          (period ? ` (${period})` : ""),
      )
    }
    lines.push("")
  } else if (s.education_raw) {
    lines.push("EDUCATION", String(s.education_raw).trim(), "")
  }

  const skillsList =
    Array.isArray(s.skills) && s.skills.length > 0
      ? s.skills
          .map((x: any) =>
            typeof x === "object" ? x.canonical_name || x.name : String(x),
          )
          .filter(Boolean)
          .join(", ")
      : s.skills_raw || ""
  if (skillsList) {
    lines.push("SKILLS", String(skillsList))
  }
  return lines.join("\n")
}

export function mapBackendResumeToDoc(
  r: BackendResume | BackendResumeUploadResponse,
  taxonomy: Skill[],
): ResumeDoc {
  const structured = r.structured_json || {}
  const text = r.raw_text || structuredToText(structured, r.title)
  const localParsed = parseResume(text, taxonomy)

  // Merge backend extracted skills if available
  const backendExtracted =
    (r as BackendResumeUploadResponse).extracted_skills ||
    structured.extracted_skills ||
    []

  const tierRank: Evidence[] = ["STRONG", "MODERATE", "LISTED", "MENTIONED"]
  const skillMap = new Map(localParsed.skills.map((s) => [s.name.toLowerCase(), s]))

  if (Array.isArray(backendExtracted)) {
    for (const bs of backendExtracted as any[]) {
      const name = bs.canonical_name || bs.name
      if (!name) continue
      const tier: Evidence = tierRank.includes(bs.evidence_level)
        ? bs.evidence_level
        : "LISTED"
      const snippet =
        (Array.isArray(bs.evidence_snippets) && bs.evidence_snippets[0]) ||
        `Verified in ${(bs.sections_found || ["resume"]).join(", ")}`
      const existing = skillMap.get(name.toLowerCase())
      if (
        !existing ||
        tierRank.indexOf(tier) < tierRank.indexOf(existing.evidence)
      ) {
        skillMap.set(name.toLowerCase(), {
          name,
          category: mapCategory(bs.category),
          evidence: tier,
          snippet,
          matchedAlias: name,
        })
      }
    }
  }

  const mergedSkills = [...skillMap.values()].sort(
    (a, b) => tierRank.indexOf(a.evidence) - tierRank.indexOf(b.evidence),
  )

  const contactInfo = structured.contact_info || {}
  const contact = {
    name: structured.full_name || contactInfo.full_name || localParsed.contact.name,
    email: contactInfo.email || localParsed.contact.email,
    phone: contactInfo.phone || localParsed.contact.phone,
    links: [
      contactInfo.linkedin,
      contactInfo.github,
      contactInfo.portfolio,
      ...localParsed.contact.links,
    ].filter(Boolean) as string[],
  }

  const sections = { ...localParsed.sections }
  if (structured.summary && !sections.Summary?.length) {
    sections.Summary = [String(structured.summary)]
  }
  if (
    (structured.experiences?.length || structured.experience_raw) &&
    !sections.Experience?.length
  ) {
    sections.Experience = ["Detected"]
  }
  if (
    (structured.projects?.length || structured.projects_raw) &&
    !sections.Projects?.length
  ) {
    sections.Projects = ["Detected"]
  }
  if (
    (structured.educations?.length || structured.education_raw) &&
    !sections.Education?.length
  ) {
    sections.Education = ["Detected"]
  }
  if (mergedSkills.length && !sections.Skills?.length) {
    sections.Skills = [mergedSkills.map((s) => s.name).join(", ")]
  }

  const atsScore = r.ats_score
    ? Math.round(r.ats_score)
    : localParsed.atsScore || 80

  const up = r as BackendResumeUploadResponse
  return {
    id: r.id,
    title: r.title || "Untitled resume",
    source:
      r.source_type === "builder"
        ? "builder"
        : r.source_type === "pasted"
          ? "pasted"
          : "uploaded",
    fileName: structured.filename,
    text,
    parsed: {
      ...localParsed,
      sections,
      skills: mergedSkills,
      contact,
      atsScore,
    },
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    structured,
    generatedProfile: up.generated_profile,
    isExactProfileMatch: up.is_exact_profile_match,
    existingResumeId: up.existing_resume_id ?? undefined,
    existingProfileTitle: up.existing_profile_title ?? undefined,
    profileMatchMessage: up.profile_match_message ?? undefined,
  }
}

export function structuredToBuilderDraft(
  structured: Record<string, any>,
  fallbackName = "",
  fallbackEmail = "",
  resumeId?: string,
  resumeTitle?: string,
): BuilderDraft {
  const contact = structured.contact_info || {}
  const exps = Array.isArray(structured.experiences)
    ? structured.experiences.map((e: any) => ({
        id: e.id || uid(),
        title: e.role_title || e.title || "",
        org: e.company || e.org || "",
        period:
          e.period ||
          [e.start_date, e.is_current ? "Present" : e.end_date]
            .filter(Boolean)
            .join(" – "),
        location: e.location || "",
        employmentType: e.employment_type || "",
        bullets:
          Array.isArray(e.bullets) && e.bullets.length > 0 ? e.bullets : [""],
      }))
    : [{ id: uid(), title: "", org: "", period: "", bullets: [""] }]

  const projs = Array.isArray(structured.projects)
    ? structured.projects.map((p: any) => ({
        id: p.id || uid(),
        title: p.title || "",
        org: Array.isArray(p.technologies)
          ? p.technologies.join(", ")
          : p.technologies || p.org || "",
        period: p.date || p.period || "",
        link: p.repo_url || p.link || "",
        liveUrl: p.live_url || "",
        bullets:
          Array.isArray(p.bullets) && p.bullets.length > 0
            ? p.bullets
            : p.description
              ? [p.description]
              : [""],
      }))
    : []

  const edus = Array.isArray(structured.educations)
    ? structured.educations.map((ed: any) => ({
        id: ed.id || uid(),
        title:
          [ed.degree, ed.field_of_study].filter(Boolean).join(" in ") ||
          ed.title ||
          "",
        org: ed.institution || ed.org || "",
        period:
          ed.period ||
          [ed.start_date, ed.end_date].filter(Boolean).join(" – "),
        location: ed.location || "",
        gpa: ed.gpa || "",
        honors: ed.honors || "",
        bullets: ed.honors ? [ed.honors] : [],
      }))
    : [{ id: uid(), title: "", org: "", period: "", bullets: [] }]

  const flatSkills = Array.isArray(structured.skills)
    ? structured.skills
        .map((s: any) =>
          typeof s === "object" ? s.canonical_name || s.name : String(s),
        )
        .filter(Boolean)
        .join(", ")
    : typeof structured.skills === "string"
      ? structured.skills
      : Array.isArray(structured.extracted_skills)
        ? structured.extracted_skills
            .map((s: any) => s.canonical_name || s.name)
            .filter(Boolean)
            .join(", ")
        : ""

  return {
    activeResumeId: resumeId,
    title: resumeTitle || structured.title || "Professional Resume",
    name: structured.full_name || contact.full_name || fallbackName,
    designation:
      structured.designation ||
      structured.headline ||
      contact.designation ||
      contact.headline ||
      "Senior Software Engineer",
    email: contact.email || fallbackEmail,
    phone: contact.phone || "",
    location: contact.location || "",
    linkedin: contact.linkedin || "",
    github: contact.github || "",
    portfolio: contact.portfolio || structured.portfolio || "",
    customLinks: structured.custom_links || contact.custom_links || [],
    summary: structured.summary || "",
    skills: flatSkills,
    skillCategories: Array.isArray(structured.skill_categories)
      ? structured.skill_categories
      : [],
    skillsDisplayMode:
      structured.style_settings?.skills_display_mode ||
      structured.skills_display_mode ||
      "rows",
    experience: exps.length
      ? exps
      : [{ id: uid(), title: "", org: "", period: "", bullets: [""] }],
    projects: projs,
    education: edus.length
      ? edus
      : [{ id: uid(), title: "", org: "", period: "", bullets: [] }],
    customTables: Array.isArray(structured.custom_tables)
      ? structured.custom_tables
      : [],
    certifications: Array.isArray(structured.certifications)
      ? structured.certifications
      : [],
    languages: Array.isArray(structured.languages) ? structured.languages : [],
    styleSettings: {
      font_family: structured.style_settings?.font_family || "sans",
      font_size: structured.style_settings?.font_size || "standard",
      line_spacing: structured.style_settings?.line_spacing || "normal",
      accent_color: structured.style_settings?.accent_color || "#1E3A8A",
    },
  }
}

export function builderDraftToStructured(
  d: BuilderDraft,
  rawText: string,
  atsScore: number,
  extractedSkills: ParsedResume["skills"],
): Record<string, any> {
  const flatSkills = d.skills
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    title: d.title || `${d.name || "Candidate"} — Resume`,
    raw_text: rawText,
    ats_score: atsScore,
    full_name: d.name,
    designation: d.designation || "",
    headline: d.designation || "",
    contact_info: {
      full_name: d.name,
      designation: d.designation || "",
      headline: d.designation || "",
      email: d.email,
      phone: d.phone,
      location: d.location,
      linkedin: d.linkedin,
      github: d.github,
      portfolio: d.portfolio || "",
      custom_links: d.customLinks || [],
    },
    custom_links: d.customLinks || [],
    summary: d.summary,
    skills: flatSkills,
    skill_categories: d.skillCategories || [],
    skills_display_mode: d.skillsDisplayMode || "rows",
    extracted_skills: extractedSkills.map((s) => ({
      skill_id: s.name.toLowerCase(),
      canonical_name: s.name,
      category: s.category,
      evidence_level: s.evidence,
      evidence_snippets: [s.snippet],
      sections_found: ["experience", "skills"],
    })),
    experiences: d.experience
      .filter((e) => e.title || e.org)
      .map((e) => {
        const [start, end] = (e.period || "").split(/\s*[–—-]\s*/)
        return {
          company: e.org || "Company",
          role_title: e.title || "Role",
          location: e.location || d.location || "",
          employment_type: e.employmentType || "",
          start_date: start || e.period || "",
          end_date: end || "",
          is_current: /present|current|now/i.test(e.period || ""),
          bullets: e.bullets.filter((b) => b.trim()),
        }
      }),
    projects: d.projects
      .filter((p) => p.title || p.org)
      .map((p) => ({
        title: p.title || "Project",
        technologies: (p.org || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        date: p.period || "",
        repo_url: p.link || "",
        live_url: p.liveUrl || "",
        bullets: p.bullets.filter((b) => b.trim()),
      })),
    educations: d.education
      .filter((ed) => ed.title || ed.org)
      .map((ed) => {
        const [deg, field] = (ed.title || "").split(/\s+in\s+/i)
        const [start, end] = (ed.period || "").split(/\s*[–—-]\s*/)
        return {
          institution: ed.org || "University",
          degree: deg || ed.title || "Degree",
          field_of_study: field || "",
          location: ed.location || "",
          start_date: start || ed.period || "",
          end_date: end || "",
          gpa: ed.gpa || "",
          honors: ed.honors || ed.bullets?.[0] || "",
        }
      }),
    custom_tables: d.customTables || [],
    certifications: d.certifications || [],
    languages: d.languages || [],
    style_settings: d.styleSettings || {
      font_family: "sans",
      font_size: "standard",
      line_spacing: "normal",
      accent_color: "#1E3A8A",
    },
  }
}

export function mapBackendAnalysisToDoc(
  a: BackendMatchAnalysis,
  resumes: ResumeDoc[],
  jobs: BackendJobDescription[],
): AnalysisDoc {
  const resume = resumes.find((r) => r.id === a.resume_id)
  const jobObj = jobs.find((j) => j.id === a.job_id)

  const gaps: SkillGap[] = (a.gaps || []).map((g) => {
    const w = g.importance === "REQUIRED" ? 1 : 0.5
    const f =
      g.gap_status === "STRONG_MATCH"
        ? 1.0
        : g.gap_status === "WEAK_EVIDENCE"
          ? 0.75
          : g.gap_status === "PARTIAL_MATCH"
            ? 0.35
            : 0
    return {
      skill: g.skill_name,
      category: mapCategory(g.category),
      status: g.gap_status,
      priority: g.priority,
      importance: g.importance,
      resumeEvidence: g.resume_evidence ?? null,
      evidenceTier:
        g.gap_status === "STRONG_MATCH"
          ? "STRONG"
          : g.gap_status === "WEAK_EVIDENCE"
            ? "LISTED"
            : null,
      jobContext: g.job_requirement_snippet || g.reason || g.importance,
      reason: g.reason,
      contribution: w * f,
    }
  })

  const rawSeniority = jobObj?.seniority_level || "Senior"
  const seniority: ParsedJob["seniority"] = /lead|principal|staff/i.test(
    rawSeniority,
  )
    ? "Lead"
    : /senior|sr/i.test(rawSeniority)
      ? "Senior"
      : /entry|junior|intern/i.test(rawSeniority)
        ? "Entry"
        : "Mid"

  const parsedJob: ParsedJob = {
    title: a.job_title || jobObj?.title || "Target Role",
    company: a.company || jobObj?.company || "Target Company",
    seniority,
    skills: gaps.map((g) => ({
      name: g.skill,
      category: g.category,
      importance: g.importance,
      weight: g.importance === "REQUIRED" ? 1 : 0.5,
      context: g.jobContext,
    })),
  }

  const overall = Math.round(a.overall_score ?? 0)
  const ai = a.ai_insights
  const tier: MatchResult["insights"]["tier"] =
    ai?.readiness_level === "Interview Ready" ||
    ai?.readiness_level === "Near Match (Minor Gaps)" ||
    ai?.readiness_level === "Core Upskilling Required"
      ? ai.readiness_level
      : overall >= 75
        ? "Interview Ready"
        : overall >= 55
          ? "Near Match (Minor Gaps)"
          : "Core Upskilling Required"

  return {
    id: a.id,
    resumeId: a.resume_id,
    resumeTitle: resume?.title || "Candidate Resume",
    jobId: a.job_id,
    jobTitle: a.job_title || "Target Role",
    company: a.company || "Target Company",
    jobText: jobObj?.raw_text || "",
    job: parsedJob,
    result: {
      overall,
      exact: Math.round(a.exact_match_score ?? overall),
      experience: Math.round(a.experience_score ?? overall),
      semantic: Math.round(a.semantic_score ?? overall),
      gaps,
      insights: {
        tier,
        summary:
          ai?.executive_summary ||
          a.summary_notes ||
          `Evaluated against ${a.total_job_skills} requirements with ${a.matched_count} matched.`,
        priorities: ai?.top_improvement_priorities || [],
        actions: ai?.strategic_action_plan || [],
        provider: ai?.provider_used || "SkillBit CareerTech Engine",
      },
    },
    createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
    matchedCount: a.matched_count,
    totalJobSkills: a.total_job_skills,
    disclaimer: a.disclaimer,
  }
}

function seedData(user: User): UserData {
  const base: UserData = {
    resumes: [],
    analyses: [],
    jobs: [],
    profile: {
      headline: "",
      location: "",
      phone: "",
      summary: "",
      targetRole: "",
      linkedin: "",
      github: "",
      website: "",
    },
    masterProfile: null,
    dashboard: null,
    recommendationsBySkill: {},
    llmProvider: "SkillBit CareerTech Engine",
    progress: {},
    roadmaps: [],
    draft: emptyDraft(user.name, user.email),
  }
  const isDemo =
    user.id === "demo" || user.email.toLowerCase() === "demo@skillbit.ai"
  if (!isDemo) return base
  const parsed = parseResume(SAMPLE_RESUME)
  const resume: ResumeDoc = {
    id: uid(),
    title: "Maya Chen — Full-Stack 2025",
    source: "uploaded",
    fileName: "maya-chen-resume.pdf",
    text: SAMPLE_RESUME,
    parsed,
    createdAt: Date.now() - 864e5 * 6,
  }
  const job = parseJob(SAMPLE_JOB)
  const analysis: AnalysisDoc = {
    id: uid(),
    resumeId: resume.id,
    resumeTitle: resume.title,
    jobTitle: job.title,
    company: job.company,
    jobText: SAMPLE_JOB,
    job,
    result: matchResume(parsed, SAMPLE_RESUME, job, SAMPLE_JOB),
    createdAt: Date.now() - 864e5 * 2,
  }
  return {
    ...base,
    resumes: [resume],
    analyses: [analysis],
    profile: {
      headline: "Full-Stack Engineer · React, Node.js, Cloud",
      location: "Seattle, WA",
      phone: "+1 415 555 0182",
      summary:
        "Full-stack engineer with 4 years of experience building data-heavy web products.",
      targetRole: "Senior Full-Stack Engineer",
      linkedin: "linkedin.com/in/mayachen",
      github: "github.com/mayachen",
      website: "",
    },
    progress: { Kubernetes: ["1.1", "1.2", "1.3", "2.1"] },
    roadmaps: [
      {
        skill: "Kubernetes",
        role: "Senior Full-Stack Engineer",
        createdAt: Date.now() - 864e5,
      },
    ],
    draft: {
      ...emptyDraft("Maya Chen", "maya.chen@email.com"),
      name: "Maya Chen",
      designation: "Full-Stack Software Engineer | React, Node.js & Cloud",
      email: "maya.chen@email.com",
      phone: "+1 415 555 0182",
      location: "Seattle, WA",
      linkedin: "linkedin.com/in/mayachen",
      github: "github.com/mayachen",
      summary:
        "Full-stack engineer with 4 years of experience building data-heavy web products across React, Node.js and AWS.",
      skills:
        "TypeScript, React, Node.js, Python, PostgreSQL, Redis, Docker, AWS, GitHub Actions",
      experience: [
        {
          id: uid(),
          title: "Software Engineer",
          org: "Lumen Analytics",
          period: "2022 – Present",
          bullets: [
            "Architected a React and TypeScript dashboard used by 40k monthly analysts, cutting page load time by 38%.",
            "Built Node.js REST APIs backed by PostgreSQL, serving 12M requests per day.",
            "Worked on caching layer with Redis for the reporting service.",
          ],
        },
      ],
      projects: [
        {
          id: uid(),
          title: "OpenTrail",
          org: "Python, FastAPI, GraphQL",
          period: "2023",
          link: "github.com/mayachen/opentrail",
          bullets: [
            "Engineered a GraphQL API for hiking route discovery, 1.2k GitHub stars.",
          ],
        },
      ],
      education: [
        {
          id: uid(),
          title: "B.S. Computer Science",
          org: "University of Washington",
          period: "2016 – 2020",
          bullets: [],
        },
      ],
    },
  }
}

/* ------------------------------------------------------------------ */

interface Ctx {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  signup: (name: string, email: string, password: string) => Promise<User>
  loginWithGoogle: (payload?: {
    credential?: string
    email?: string
    full_name?: string
    picture?: string
  }) => Promise<User>
  logout: () => void
  data: UserData | null
  update: (fn: (d: UserData) => UserData) => void
  refreshFromBackend: () => Promise<void>
  taxonomy: Skill[]
  customSkills: Skill[]
  backendSkills: BackendSkill[]
  addSkill: (
    name: string,
    category: Category,
    aliases: string[],
    description?: string,
  ) => Promise<void>
  removeSkill: (name: string) => Promise<void>
  registeredUsers: () => User[]
  adminMetrics: BackendAdminMetrics | null
  refreshAdminMetrics: () => Promise<void>
  googleClientId: string
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    read<User | null>(SESSION_KEY, null),
  )
  const [data, setData] = useState<UserData | null>(() => {
    const u = read<User | null>(SESSION_KEY, null)
    return u
      ? (read<UserData | null>(dataKey(u.id), null) ?? seedData(u))
      : null
  })
  const [customSkills, setCustomSkills] = useState<Skill[]>(() =>
    read<Skill[]>(TAX_KEY, []),
  )
  const [backendSkills, setBackendSkills] = useState<BackendSkill[]>([])
  const [adminMetrics, setAdminMetrics] = useState<BackendAdminMetrics | null>(
    null,
  )
  const [googleClientId, setGoogleClientId] = useState<string>(
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "",
  )

  useEffect(() => {
    if (user && data) write(dataKey(user.id), data)
  }, [user, data])
  useEffect(() => write(TAX_KEY, customSkills), [customSkills])

  const taxonomy = useMemo(() => {
    const map = new Map<string, Skill>()
    for (const b of BASE_TAXONOMY) {
      map.set(b.name.toLowerCase(), b)
    }
    for (const bs of backendSkills) {
      const key = bs.canonical_name.toLowerCase()
      const prev = map.get(key)
      const aliases = (bs.aliases || [])
        .map((a) => a.alias_name)
        .filter((a) => a.toLowerCase() !== key)
      map.set(key, {
        name: bs.canonical_name,
        category: prev?.category ?? mapCategory(bs.category),
        aliases: [...new Set([...(prev?.aliases ?? []), ...aliases])],
        related: prev?.related ?? [],
        description: bs.description ?? prev?.description,
      })
    }
    for (const c of customSkills) {
      map.set(c.name.toLowerCase(), c)
    }
    return [...map.values()]
  }, [backendSkills, customSkills])

  const fetchPublicConfigAndSkills = useCallback(async () => {
    try {
      const [cfg, sks] = await Promise.allSettled([
        api.getAuthConfig(),
        api.getSkills({ limit: 500 }),
      ])
      if (cfg.status === "fulfilled" && cfg.value?.google_client_id) {
        setGoogleClientId(cfg.value.google_client_id)
      }
      if (sks.status === "fulfilled" && Array.isArray(sks.value)) {
        setBackendSkills(sks.value)
      }
    } catch {
      // ignore if offline
    }
  }, [])

  useEffect(() => {
    fetchPublicConfigAndSkills()
  }, [fetchPublicConfigAndSkills])

  const refreshAdminMetrics = useCallback(async () => {
    if (!getToken()) return
    try {
      const [m, sks] = await Promise.allSettled([
        api.getAdminMetrics(),
        api.getSkills({ limit: 500 }),
      ])
      if (m.status === "fulfilled") setAdminMetrics(m.value)
      if (sks.status === "fulfilled" && Array.isArray(sks.value)) {
        setBackendSkills(sks.value)
      }
    } catch {
      // ignore
    }
  }, [])

  const hydrateUserDataFromBackend = useCallback(
    async (pub: User, tax: Skill[]) => {
      const localCached =
        read<UserData | null>(dataKey(pub.id), null) ?? seedData(pub)

      if (!getToken()) {
        setData(localCached)
        return
      }

      try {
        const [
          resumesRes,
          jobsRes,
          histRes,
          profRes,
          dashRes,
          llmRes,
        ] = await Promise.allSettled([
          api.getResumes(),
          api.getJobs(),
          api.getMatchHistory(),
          api.getProfile(),
          api.getDashboard(),
          api.getLlmProvider(),
        ])

        const backendResumes =
          resumesRes.status === "fulfilled" ? resumesRes.value : []
        const jobs = jobsRes.status === "fulfilled" ? jobsRes.value : []
        const historyItems =
          histRes.status === "fulfilled" ? histRes.value : []
        const masterProfile =
          profRes.status === "fulfilled" ? profRes.value : null
        const dashboard =
          dashRes.status === "fulfilled" ? dashRes.value : null
        const llmProvider =
          llmRes.status === "fulfilled"
            ? llmRes.value.name
            : "SkillBit CareerTech Engine"

        const mappedResumes = backendResumes.map((r) =>
          mapBackendResumeToDoc(r, tax),
        )

        // Fetch full analysis details + recommendations for recent history items
        const fullAnalysesResults = await Promise.allSettled(
          historyItems.slice(0, 15).map((h) => api.getAnalysisById(h.id)),
        )
        const mappedAnalyses: AnalysisDoc[] = []
        for (const r of fullAnalysesResults) {
          if (r.status === "fulfilled") {
            mappedAnalyses.push(
              mapBackendAnalysisToDoc(r.value, mappedResumes, jobs),
            )
          }
        }

        const recsBySkill: Record<string, BackendRecommendation> = {
          ...(localCached.recommendationsBySkill ?? {}),
        }
        if (mappedAnalyses[0]) {
          try {
            const recs = await api.getRecommendations(mappedAnalyses[0].id)
            for (const rec of recs) {
              recsBySkill[rec.skill_name] = rec
            }
          } catch {
            // ignore
          }
        }

        const mergedProfile: Profile = {
          headline:
            masterProfile?.headline || localCached.profile.headline || "",
          location:
            masterProfile?.location || localCached.profile.location || "",
          phone: masterProfile?.phone || localCached.profile.phone || "",
          summary: masterProfile?.summary || localCached.profile.summary || "",
          targetRole:
            localCached.profile.targetRole ||
            mappedAnalyses[0]?.jobTitle ||
            masterProfile?.headline ||
            "Software Engineer",
          linkedin:
            masterProfile?.linkedin_url || localCached.profile.linkedin || "",
          github: masterProfile?.github_url || localCached.profile.github || "",
          website:
            masterProfile?.portfolio_url || localCached.profile.website || "",
        }

        // Populate builder draft from latest resume if draft hasn't been customized yet
        let draft = localCached.draft
        if (
          mappedResumes[0]?.structured &&
          (!draft.name || !draft.activeResumeId)
        ) {
          draft = structuredToBuilderDraft(
            mappedResumes[0].structured,
            pub.name,
            pub.email,
            mappedResumes[0].id,
            mappedResumes[0].title,
          )
        }

        // Populate roadmaps from backend recommendations if empty
        const existingRoadmapSkills = new Set(
          localCached.roadmaps.map((r) => r.skill.toLowerCase()),
        )
        const extraRoadmaps: RoadmapEntry[] = []
        for (const rec of Object.values(recsBySkill)) {
          if (!existingRoadmapSkills.has(rec.skill_name.toLowerCase())) {
            extraRoadmaps.push({
              skill: rec.skill_name,
              role: mergedProfile.targetRole || "Software Engineer",
              createdAt: Date.now(),
            })
            existingRoadmapSkills.add(rec.skill_name.toLowerCase())
          }
        }

        const nextData: UserData = {
          ...localCached,
          resumes:
            mappedResumes.length > 0 ? mappedResumes : localCached.resumes,
          analyses:
            mappedAnalyses.length > 0 ? mappedAnalyses : localCached.analyses,
          jobs,
          profile: mergedProfile,
          masterProfile,
          dashboard,
          recommendationsBySkill: recsBySkill,
          llmProvider,
          roadmaps: [...localCached.roadmaps, ...extraRoadmaps],
          draft,
        }

        setData(nextData)
        write(dataKey(pub.id), nextData)

        if (pub.role === "admin") {
          refreshAdminMetrics()
        }
      } catch {
        setData(localCached)
      }
    },
    [refreshAdminMetrics],
  )

  const refreshFromBackend = useCallback(async () => {
    if (user) {
      await hydrateUserDataFromBackend(user, taxonomy)
    }
  }, [user, taxonomy, hydrateUserDataFromBackend])

  // Verify token & sync data on initial mount if user session exists
  useEffect(() => {
    if (user && getToken()) {
      hydrateUserDataFromBackend(user, taxonomy)
    }
  }, [user?.id])

  const startSession = useCallback(
    async (u: StoredUser) => {
      const { password: _pw, ...pub } = u
      write(SESSION_KEY, pub)
      setUser(pub)
      const initial =
        read<UserData | null>(dataKey(pub.id), null) ?? seedData(pub)
      setData(initial)
      await hydrateUserDataFromBackend(pub, taxonomy)
      return pub
    },
    [hydrateUserDataFromBackend, taxonomy],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await api.login(email, password)
        setToken(res.access_token)
        const backendUser: StoredUser = {
          id: res.user_id,
          name: res.full_name || res.email.split("@")[0],
          email: res.email,
          password: "",
          role: res.role === "admin" ? "admin" : "user",
          provider: "email",
          picture: res.picture,
          createdAt: Date.now(),
        }
        return await startSession(backendUser)
      } catch (apiErr) {
        // Fallback to local demo users if backend is unreachable
        const found = allUsers().find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
        )
        if (found && found.password === password) {
          return await startSession(found)
        }
        throw apiErr instanceof Error
          ? apiErr
          : new Error("Incorrect email or password.")
      }
    },
    [startSession],
  )

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        await api.register(name, email, password)
        return await login(email, password)
      } catch (apiErr) {
        const msg = (apiErr as Error)?.message || ""
        if (msg.toLowerCase().includes("already exists")) {
          throw new Error("An account with this email already exists.")
        }
        // Fallback if backend is offline
        if (
          allUsers().some(
            (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
          )
        )
          throw new Error("An account with this email already exists.")
        const nu: StoredUser = {
          id: uid(),
          name: name.trim(),
          email: email.trim(),
          password,
          role: "user",
          provider: "email",
          createdAt: Date.now(),
        }
        write(USERS_KEY, [...read<StoredUser[]>(USERS_KEY, []), nu])
        return await startSession(nu)
      }
    },
    [login, startSession],
  )

  const loginWithGoogle = useCallback(
    async (payload?: {
      credential?: string
      email?: string
      full_name?: string
      picture?: string
    }) => {
      const reqPayload = payload ?? {
        email: "candidate@gmail.com",
        full_name: "Google Candidate",
      }
      try {
        const res = await api.googleLogin(reqPayload)
        setToken(res.access_token)
        const backendUser: StoredUser = {
          id: res.user_id,
          name: res.full_name || res.email.split("@")[0],
          email: res.email,
          password: "",
          role: res.role === "admin" ? "admin" : "user",
          provider: "google",
          picture: res.picture,
          createdAt: Date.now(),
        }
        return await startSession(backendUser)
      } catch {
        const email = reqPayload.email || "candidate@gmail.com"
        let found = allUsers().find((u) => u.email === email)
        if (!found) {
          found = {
            id: uid(),
            name: reqPayload.full_name || "Google Candidate",
            email,
            password: uid(),
            role: "user",
            provider: "google",
            createdAt: Date.now(),
          }
          write(USERS_KEY, [...read<StoredUser[]>(USERS_KEY, []), found])
        }
        return await startSession(found)
      }
    },
    [startSession],
  )

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setData(null)
  }, [])

  const update = useCallback(
    (fn: (d: UserData) => UserData) => setData((d) => (d ? fn(d) : d)),
    [],
  )

  const addSkill = useCallback(
    async (
      name: string,
      category: Category,
      aliases: string[],
      description?: string,
    ) => {
      setCustomSkills((prev) => [
        ...prev.filter((p) => p.name.toLowerCase() !== name.toLowerCase()),
        { name, category, aliases, description, related: [] },
      ])
      if (getToken()) {
        try {
          const created = await api.adminCreateSkill({
            canonical_name: name,
            category,
            description,
            aliases,
          })
          setBackendSkills((prev) => [
            ...prev.filter(
              (s) =>
                s.canonical_name.toLowerCase() !==
                created.canonical_name.toLowerCase(),
            ),
            created,
          ])
        } catch {
          // keep local custom skill if backend call fails
        }
      }
    },
    [],
  )

  const removeSkill = useCallback(
    async (name: string) => {
      setCustomSkills((prev) => prev.filter((p) => p.name !== name))
      const found = backendSkills.find(
        (s) => s.canonical_name.toLowerCase() === name.toLowerCase(),
      )
      if (found && getToken()) {
        try {
          await api.adminDeleteSkill(found.id)
          setBackendSkills((prev) => prev.filter((s) => s.id !== found.id))
        } catch {
          // ignore
        }
      }
    },
    [backendSkills],
  )

  const registeredUsers = useCallback(() => {
    const localList = allUsers().map(({ password: _p, ...u }) => u)
    const backendList = (adminMetrics?.registered_users ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: (u.role === "admin" ? "admin" : "user") as Role,
      provider: u.provider,
      createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
    }))
    const seen = new Set<string>()
    const merged: User[] = []
    for (const u of [...backendList, ...localList]) {
      const k = u.email.toLowerCase()
      if (!seen.has(k)) {
        seen.add(k)
        merged.push(u)
      }
    }
    return merged
  }, [adminMetrics])

  const value = useMemo(
    () => ({
      user,
      login,
      signup,
      loginWithGoogle,
      logout,
      data,
      update,
      refreshFromBackend,
      taxonomy,
      customSkills,
      backendSkills,
      addSkill,
      removeSkill,
      registeredUsers,
      adminMetrics,
      refreshAdminMetrics,
      googleClientId,
    }),
    [
      user,
      login,
      signup,
      loginWithGoogle,
      logout,
      data,
      update,
      refreshFromBackend,
      taxonomy,
      customSkills,
      backendSkills,
      addSkill,
      removeSkill,
      registeredUsers,
      adminMetrics,
      refreshAdminMetrics,
      googleClientId,
    ],
  )
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error("useApp must be used inside AppProvider")
  return ctx
}

/** Convenience hook for pages rendered inside the authenticated shell. */
export function useUserData() {
  const { data, update, user, taxonomy, refreshFromBackend } = useApp()
  return {
    data: data!,
    update,
    user: user!,
    taxonomy,
    refreshFromBackend,
  }
}

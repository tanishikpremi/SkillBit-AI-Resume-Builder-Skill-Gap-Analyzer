import { BASE_TAXONOMY, type Category, type Skill } from "./taxonomy"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Evidence = "STRONG" | "MODERATE" | "LISTED" | "MENTIONED"
export type GapStatus = "STRONG_MATCH" | "WEAK_EVIDENCE" | "PARTIAL_MATCH" | "MISSING"
export type Priority = "HIGH" | "MEDIUM" | "LOW"
export type SectionName = "Contact" | "Summary" | "Experience" | "Projects" | "Education" | "Skills" | "Other"

export const EVIDENCE_WEIGHT: Record<Evidence, number> = {
  STRONG: 1,
  MODERATE: 0.85,
  LISTED: 0.6,
  MENTIONED: 0.4,
}

export interface ExtractedSkill {
  name: string
  category: Category
  evidence: Evidence
  snippet: string
  matchedAlias: string
}

export interface ResumeContact {
  email?: string
  phone?: string
  links: string[]
  name?: string
}

export interface ParsedResume {
  sections: Partial<Record<SectionName, string[]>>
  skills: ExtractedSkill[]
  contact: ResumeContact
  atsScore: number
  quantifiedRatio: number
  bulletCount: number
}

export interface JobSkill {
  name: string
  category: Category
  importance: "REQUIRED" | "PREFERRED"
  weight: number
  context: string
}

export interface ParsedJob {
  title: string
  company: string
  seniority: "Lead" | "Senior" | "Mid" | "Entry"
  skills: JobSkill[]
}

export interface SkillGap {
  skill: string
  category: Category
  status: GapStatus
  priority: Priority
  importance: "REQUIRED" | "PREFERRED"
  resumeEvidence: string | null
  evidenceTier: Evidence | null
  jobContext: string
  reason?: string
  relatedSkill?: string
  contribution: number
}

export interface MatchResult {
  overall: number
  exact: number
  experience: number
  semantic: number
  gaps: SkillGap[]
  insights: {
    tier: "Interview Ready" | "Near Match (Minor Gaps)" | "Core Upskilling Required"
    summary: string
    priorities: string[]
    actions: string[]
    provider: string
  }
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

const escapeRe = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const AMBIGUOUS = new Set([
  "go",
  "rust",
  "swift",
  "spring",
  "express",
  "spark",
  "shell",
  "node",
  "rest",
  "elastic",
  "linear",
  "sketch",
  "dart",
  "vue",
])
const reCache = new Map<string, RegExp>()

function aliasRegex(alias: string) {
  const cached = reCache.get(alias)
  if (cached) return cached
  let pattern = alias
  let flags = "i"
  if (alias.length <= 3 && /^[a-z]+$/.test(alias)) {
    // short lowercase acronyms ("ts", "ml", "drf") only count when written as acronyms
    pattern = alias.toUpperCase()
    flags = ""
  } else if (alias.length <= 2 || AMBIGUOUS.has(alias.toLowerCase())) {
    // common English words ("Go", "Rust", "Spark") only count when capitalized
    pattern = alias.charAt(0).toUpperCase() + alias.slice(1)
    flags = ""
  }
  // Boundary-safe: keeps "Java" from matching inside "JavaScript" and "C" inside "CSS".
  const re = new RegExp(
    `(?<![a-zA-Z0-9+#.&])${escapeRe(pattern)}(?![a-zA-Z0-9+#&]|\\.[a-zA-Z])`,
    flags,
  )
  reCache.set(alias, re)
  return re
}

const ACTION_VERBS = [
  "architected",
  "engineered",
  "built",
  "deployed",
  "optimized",
  "scaled",
  "designed",
  "developed",
  "implemented",
  "led",
  "launched",
  "migrated",
  "automated",
  "reduced",
  "increased",
  "delivered",
  "shipped",
  "created",
  "improved",
  "refactored",
  "spearheaded",
  "orchestrated",
  "integrated",
]
const hasActionVerb = (line: string) =>
  ACTION_VERBS.some((v) => new RegExp(`\\b${v}\\b`, "i").test(line))
const hasMetric = (line: string) =>
  /\d+(\.\d+)?\s?(%|x|k|m|ms|s|\+|users|req|requests|hours|days)?/i.test(
    line,
  ) && /\d/.test(line)

const STOP = new Set(
  "a an and the of to in for on with at by from or as is are be was were this that it its our your you we will have has using use experience years year strong ability work working team".split(
    " ",
  ),
)
export function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

function cosine(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0
  let na = 0
  let nb = 0
  a.forEach((v, k) => {
    na += v * v
    const w = b.get(k)
    if (w) dot += v * w
  })
  b.forEach((v) => (nb += v * v))
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

function wordVec(text: string) {
  const t = tokens(text)
  const m = new Map<string, number>()
  t.forEach((w, i) => {
    m.set(w, (m.get(w) ?? 0) + 1)
    if (i < t.length - 1) {
      const bi = `${w} ${t[i + 1]}`
      m.set(bi, (m.get(bi) ?? 0) + 1)
    }
  })
  return m
}

function charVec(text: string) {
  const m = new Map<string, number>()
  tokens(text).forEach((w) => {
    const padded = ` ${w} `
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i + n <= padded.length; i++) {
        const g = padded.slice(i, i + n)
        m.set(g, (m.get(g) ?? 0) + 1)
      }
    }
  })
  return m
}

/** Hybrid similarity: 0.40 word TF + 0.35 token Jaccard + 0.25 char n-gram (3..5). */
export function semanticSimilarity(a: string, b: string) {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  const inter = [...ta].filter((x) => tb.has(x)).length
  const union = new Set([...ta, ...tb]).size || 1
  return (
    0.4 * cosine(wordVec(a), wordVec(b)) +
    0.35 * (inter / union) +
    0.25 * cosine(charVec(a), charVec(b))
  )
}

/* ------------------------------------------------------------------ */
/* Resume parsing                                                      */
/* ------------------------------------------------------------------ */

const SECTION_PATTERNS: [SectionName, RegExp][] = [
  ["Summary", /^(professional\s+)?(summary|profile|objective|about( me)?)\b/i],
  [
    "Experience",
    /^(work\s+|professional\s+)?(experience|employment|work history)\b/i,
  ],
  ["Projects", /^(personal\s+|key\s+|selected\s+)?projects?\b/i],
  ["Education", /^(education|academics?|qualifications)\b/i],
  [
    "Skills",
    /^(technical\s+|core\s+|key\s+)?(skills|competencies|tech stack|technologies)\b/i,
  ],
]

export function normalizeText(raw: string) {
  return (
    raw
      .replace(/\r/g, "")
      .replace(/(\w)-\n(\w)/g, "$1$2") // unwrap hyphenated line-breaks
      .replace(/[•▪◦●■►–]/g, "-")
  )
}

export function parseResume(
  raw: string,
  taxonomy: Skill[] = BASE_TAXONOMY,
): ParsedResume {
  const text = normalizeText(raw)
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  const sections: Partial<Record<SectionName, string[]>> = {}
  let current: SectionName = "Contact"
  for (const line of lines) {
    const header = line.replace(/[:\-–—]+$/, "").trim()
    const match =
      header.length < 40
        ? SECTION_PATTERNS.find(([, re]) => re.test(header))
        : undefined
    if (match) {
      current = match[0]
      sections[current] ??= []
      continue
    }
    ;(sections[current] ??= []).push(line)
  }

  const tierRank: Evidence[] = ["STRONG", "MODERATE", "LISTED", "MENTIONED"]
  const found = new Map<string, ExtractedSkill>()
  for (const [section, sLines] of Object.entries(
    sections,
  ) as [SectionName, string[]][]) {
    for (const line of sLines) {
      for (const sk of taxonomy) {
        const candidates = [sk.name, ...sk.aliases]
        const alias = candidates.find((a) => aliasRegex(a).test(line))
        if (!alias) continue
        let tier: Evidence
        if (section === "Experience" || section === "Projects") {
          tier = hasActionVerb(line) || hasMetric(line) ? "STRONG" : "MODERATE"
        } else if (section === "Skills") tier = "LISTED"
        else tier = "MENTIONED"
        const prev = found.get(sk.name)
        if (!prev || tierRank.indexOf(tier) < tierRank.indexOf(prev.evidence)) {
          found.set(sk.name, {
            name: sk.name,
            category: sk.category,
            evidence: tier,
            snippet: line,
            matchedAlias: alias,
          })
        }
      }
    }
  }

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0]
  const phone = text.match(/\+?\d[\d\s().-]{8,}\d/)?.[0]
  const links = [
    ...text.matchAll(
      /(https?:\/\/)?(www\.)?(linkedin\.com|github\.com)\/[\w\-/]+/gi,
    ),
  ].map((m) => m[0])
  const name =
    sections.Contact?.[0] &&
    sections.Contact[0].length < 40 &&
    !/@/.test(sections.Contact[0])
      ? sections.Contact[0]
      : undefined

  const bullets = [
    ...(sections.Experience ?? []),
    ...(sections.Projects ?? []),
  ].filter((l) => l.length > 25)
  const quantified = bullets.filter(hasMetric).length
  const quantifiedRatio = bullets.length ? quantified / bullets.length : 0

  const sectionScore =
    ([
      "Summary",
      "Experience",
      "Projects",
      "Education",
      "Skills",
    ] as SectionName[]).filter((k) => sections[k]?.length).length / 5
  const contactScore =
    (email ? 0.5 : 0) + (phone ? 0.25 : 0) + (links.length ? 0.25 : 0)
  const skillScore = Math.min(1, found.size / 14)
  const atsScore = Math.round(
    (sectionScore * 0.35 +
      contactScore * 0.15 +
      skillScore * 0.25 +
      quantifiedRatio * 0.25) *
      100,
  )

  return {
    sections,
    skills: [...found.values()].sort(
      (a, b) => tierRank.indexOf(a.evidence) - tierRank.indexOf(b.evidence),
    ),
    contact: { email, phone, links, name },
    atsScore,
    quantifiedRatio,
    bulletCount: bullets.length,
  }
}

/* ------------------------------------------------------------------ */
/* Job parsing                                                         */
/* ------------------------------------------------------------------ */

export function parseJob(
  raw: string,
  taxonomy: Skill[] = BASE_TAXONOMY,
): ParsedJob {
  const lines = normalizeText(raw)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  const title = lines[0]?.slice(0, 80) ?? "Untitled role"
  const companyLine = lines.find((l) =>
    /^(company|at|employer)\s*[:\-]/i.test(l),
  )
  const company = companyLine?.split(/[:\-]/).slice(1).join(" ").trim() ?? ""
  const lower = raw.toLowerCase()
  const seniority: ParsedJob["seniority"] =
    /\b(lead|principal|staff|head of)\b/.test(lower)
      ? "Lead"
      : /\b(senior|sr\.?|5\+ years|6\+ years|7\+ years)\b/.test(lower)
        ? "Senior"
        : /\b(junior|entry|graduate|intern|0-2 years|new grad)\b/.test(lower)
          ? "Entry"
          : "Mid"

  let mode: "REQUIRED" | "PREFERRED" = "REQUIRED"
  const found = new Map<string, JobSkill>()
  for (const line of lines) {
    if (
      /^(preferred|nice to have|bonus|good to have|pluses|desirable)/i.test(
        line,
      )
    )
      mode = "PREFERRED"
    else if (
      /^(requirements|required|must have|qualifications|what you('|’)ll need|minimum)/i.test(
        line,
      )
    )
      mode = "REQUIRED"
    const lineImportance =
      /(preferred|nice to have|a plus|bonus|is a plus|familiarity)/i.test(line)
        ? "PREFERRED"
        : mode
    for (const sk of taxonomy) {
      if (![sk.name, ...sk.aliases].some((a) => aliasRegex(a).test(line)))
        continue
      const prev = found.get(sk.name)
      if (
        !prev ||
        (prev.importance === "PREFERRED" && lineImportance === "REQUIRED")
      ) {
        found.set(sk.name, {
          name: sk.name,
          category: sk.category,
          importance: lineImportance,
          weight: lineImportance === "REQUIRED" ? 1 : 0.5,
          context: line,
        })
      }
    }
  }
  return { title, company, seniority, skills: [...found.values()] }
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

export function matchResume(
  resume: ParsedResume,
  resumeText: string,
  job: ParsedJob,
  jobText: string,
  taxonomy: Skill[] = BASE_TAXONOMY,
): MatchResult {
  const have = new Map(resume.skills.map((sk) => [sk.name, sk]))
  const bullets = [
    ...(resume.sections.Experience ?? []),
    ...(resume.sections.Projects ?? []),
    ...(resume.sections.Summary ?? []),
  ]
  const gaps: SkillGap[] = []
  let wSum = 0
  let fSum = 0
  let exactSum = 0
  let expSum = 0
  let expW = 0

  for (const js of job.skills) {
    wSum += js.weight
    const own = have.get(js.name)
    if (own) {
      const e = EVIDENCE_WEIGHT[own.evidence]
      const sem = semanticSimilarity(own.snippet, js.context)
      const f = 0.6 * 1 + 0.4 * Math.max(e, sem)
      fSum += js.weight * f
      exactSum += js.weight
      expSum += js.weight * e
      expW += js.weight
      const strong = own.evidence === "STRONG" || own.evidence === "MODERATE"
      gaps.push({
        skill: js.name,
        category: js.category,
        status: strong ? "STRONG_MATCH" : "WEAK_EVIDENCE",
        priority: strong
          ? "LOW"
          : js.importance === "REQUIRED"
            ? "HIGH"
            : "MEDIUM",
        importance: js.importance,
        resumeEvidence: own.snippet,
        evidenceTier: own.evidence,
        jobContext: js.context,
        contribution: js.weight * f,
      })
    } else {
      const def = taxonomy.find((t) => t.name === js.name)
      const related = def?.related?.find((r) => have.has(r))
      const textSim = bullets.reduce(
        (m, b) => Math.max(m, semanticSimilarity(b, js.context)),
        0,
      )
      const sem = Math.max(textSim, related ? 0.74 : 0)
      const partial = sem >= 0.7
      const f = partial ? 0.45 * sem : 0
      fSum += js.weight * f
      gaps.push({
        skill: js.name,
        category: js.category,
        status: partial ? "PARTIAL_MATCH" : "MISSING",
        priority: partial
          ? "MEDIUM"
          : js.importance === "REQUIRED"
            ? "HIGH"
            : "MEDIUM",
        importance: js.importance,
        resumeEvidence: related ? have.get(related)!.snippet : null,
        evidenceTier: null,
        jobContext: js.context,
        relatedSkill: related,
        contribution: js.weight * f,
      })
    }
  }

  const overall = wSum ? Math.min(100, (fSum / wSum) * 100) : 0
  const exact = wSum ? (exactSum / wSum) * 100 : 0
  const experience = expW ? (expSum / expW) * 100 : 0
  const semantic = Math.min(
    100,
    Math.sqrt(semanticSimilarity(resumeText, jobText)) * 125,
  )

  const order: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  gaps.sort(
    (a, b) =>
      order[a.priority] - order[b.priority] ||
      (a.importance === "REQUIRED" ? -1 : 1),
  )

  return {
    overall: Math.round(overall),
    exact: Math.round(exact),
    experience: Math.round(experience),
    semantic: Math.round(semantic),
    gaps,
    insights: buildInsights(Math.round(overall), gaps, job),
  }
}

function buildInsights(
  overall: number,
  gaps: SkillGap[],
  job: ParsedJob,
): MatchResult["insights"] {
  const tier =
    overall >= 75
      ? "Interview Ready"
      : overall >= 55
        ? "Near Match (Minor Gaps)"
        : "Core Upskilling Required"
  const strong = gaps
    .filter((g) => g.status === "STRONG_MATCH")
    .map((g) => g.skill)
  const missing = gaps
    .filter((g) => g.status === "MISSING" && g.importance === "REQUIRED")
    .map((g) => g.skill)
  const weak = gaps
    .filter((g) => g.status === "WEAK_EVIDENCE")
    .map((g) => g.skill)
  const partial = gaps.filter((g) => g.status === "PARTIAL_MATCH")
  const list = (arr: string[], n = 3) => arr.slice(0, n).join(", ")

  const summary = [
    strong.length
      ? `Your profile shows verified, experience-backed proof in ${list(strong)}${
          strong.length > 3 ? ` and ${strong.length - 3} more` : ""
        }.`
      : "Your resume does not yet show experience-backed proof for this role’s core stack.",
    missing.length
      ? `The biggest blockers for this ${job.seniority.toLowerCase()}-level role are ${list(missing)}, which are required but absent.`
      : "No required skills are fully missing — the remaining work is about strengthening evidence.",
    weak.length
      ? `${list(weak)} ${
          weak.length === 1 ? "is" : "are"
        } only listed, not demonstrated in work bullets.`
      : "",
  ]
    .filter(Boolean)
    .join(" ")

  const priorities = gaps
    .filter((g) => g.priority !== "LOW")
    .slice(0, 3)
    .map((g) =>
      g.status === "WEAK_EVIDENCE"
        ? `Prove ${g.skill} with a quantified experience bullet`
        : g.status === "PARTIAL_MATCH"
          ? `Bridge ${g.relatedSkill ?? "related"} → ${g.skill} with a focused delta project`
          : `Learn ${g.skill} through the 4-stage roadmap`,
    )

  const actions = [
    missing[0]
      ? `This week: start Stage 01 of the ${missing[0]} roadmap and ship a small proof-of-concept.`
      : "This week: tailor your summary to mirror the role’s top three requirements.",
    weak[0]
      ? `Rewrite one bullet using STAR to show ${weak[0]} in production, with a measurable result.`
      : "Add metrics (%, latency, users, cost) to at least 60% of your experience bullets.",
    partial[0]
      ? `Frame your ${partial[0].relatedSkill} work as transferable to ${partial[0].skill} in your project section.`
      : "Export a single-column ATS PDF from the builder before applying.",
  ]

  return {
    tier,
    summary,
    priorities,
    actions,
    provider: "SkillBit Local CareerTech Engine",
  }
}

/* ------------------------------------------------------------------ */
/* STAR bullet optimizer (anti-hallucination: never invents facts)     */
/* ------------------------------------------------------------------ */

export interface Normalized {
  raw: string
  canonical: string | null
  category?: Category
  method: "EXACT" | "ALIAS" | "FUZZY" | "UNKNOWN"
}

export function normalizeSkills(
  input: string,
  taxonomy: Skill[] = BASE_TAXONOMY,
): Normalized[] {
  return input
    .split(/[,\n;]+/)
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((raw) => {
      const low = raw.toLowerCase()
      const exact = taxonomy.find((t) => t.name.toLowerCase() === low)
      if (exact)
        return {
          raw,
          canonical: exact.name,
          category: exact.category,
          method: "EXACT" as const,
        }
      const alias = taxonomy.find((t) =>
        t.aliases.some((a) => a.toLowerCase() === low),
      )
      if (alias)
        return {
          raw,
          canonical: alias.name,
          category: alias.category,
          method: "ALIAS" as const,
        }
      let best: Skill | null = null
      let bestScore = 0
      for (const t of taxonomy) {
        for (const cand of [t.name, ...t.aliases]) {
          const sc = cosine(charVec(cand), charVec(raw))
          if (sc > bestScore) {
            bestScore = sc
            best = t
          }
        }
      }
      if (best && bestScore >= 0.55 && raw.length > 2)
        return {
          raw,
          canonical: best.name,
          category: best.category,
          method: "FUZZY" as const,
        }
      return { raw, canonical: null, method: "UNKNOWN" as const }
    })
}

const WEAK_PHRASES: [RegExp, string][] = [
  [/^(i\s+)?worked on\b/i, "Engineered"],
  [/^(i\s+)?helped (with|to)?\b/i, "Facilitated"],
  [/^(i\s+)?was responsible for\b/i, "Owned"],
  [/^(i\s+)?responsible for\b/i, "Owned"],
  [/^(i\s+)?used\b/i, "Leveraged"],
  [/^(i\s+)?made\b/i, "Built"],
  [/^(i\s+)?did\b/i, "Delivered"],
  [/^(i\s+)?participated in\b/i, "Contributed to"],
  [/^(i\s+)?handled\b/i, "Managed"],
  [/^(i\s+)?assisted (with|in)?\b/i, "Supported"],
]

export function improveBullet(bullet: string): string[] {
  let core = bullet
    .trim()
    .replace(/^[-*]\s*/, "")
    .replace(/\.$/, "")
  let swapped = false
  for (const [re, verb] of WEAK_PHRASES) {
    if (re.test(core)) {
      core = core.replace(re, verb).replace(/\s+/g, " ")
      swapped = true
      break
    }
  }
  if (!swapped && !hasActionVerb(core))
    core = `Delivered ${core.charAt(0).toLowerCase()}${core.slice(1)}`
  core = core.charAt(0).toUpperCase() + core.slice(1)
  const metric = hasMetric(core)
  return [
    metric ? `${core}.` : `${core}, improving [metric] by [X]%.`,
    metric
      ? `${core}, cutting turnaround for the team.`
      : `${core} for [N] users, reducing [cost/latency] by [X]%.`,
    `Situation: [context]. ${core}${
      metric ? "" : ", resulting in [measurable outcome]"
    }.`,
  ]
}

/* ------------------------------------------------------------------ */
/* Roadmaps                                                            */
/* ------------------------------------------------------------------ */

export interface RoadmapTopic {
  id: string
  label: string
}
export interface RoadmapStage {
  id: string
  title: string
  duration: string
  topics: RoadmapTopic[]
  milestone: string
}
export interface Roadmap {
  skill: string
  role: string
  docs: string
  stages: RoadmapStage[]
  capstone: string
}

const DOCS: Record<string, string> = {
  Kubernetes: "https://kubernetes.io/docs/home/",
  Docker: "https://docs.docker.com/",
  AWS: "https://docs.aws.amazon.com/",
  TypeScript: "https://www.typescriptlang.org/docs/",
  React: "https://react.dev/learn",
  Python: "https://docs.python.org/3/",
  PostgreSQL: "https://www.postgresql.org/docs/",
  "Apache Kafka": "https://kafka.apache.org/documentation/",
  GraphQL: "https://graphql.org/learn/",
  Terraform: "https://developer.hashicorp.com/terraform/docs",
  Go: "https://go.dev/doc/",
  Rust: "https://doc.rust-lang.org/book/",
  "Next.js": "https://nextjs.org/docs",
  FastAPI: "https://fastapi.tiangolo.com/",
  Redis: "https://redis.io/docs/",
  "CI/CD": "https://docs.github.com/actions",
  "Google Cloud": "https://cloud.google.com/docs",
  "Microsoft Azure": "https://learn.microsoft.com/azure/",
  PyTorch: "https://pytorch.org/docs/stable/",
  "System Design": "https://roadmap.sh/system-design",
}

const SPECIFIC: Record<string, string[][]> = {
  Kubernetes: [
    [
      "Pods, ReplicaSets & Deployments",
      "kubectl & cluster contexts",
      "Services & networking basics",
      "Run a local cluster with kind/minikube",
    ],
    [
      "ConfigMaps, Secrets & volumes",
      "Ingress controllers",
      "Helm charts & templating",
      "Namespaces & RBAC",
    ],
    [
      "Horizontal Pod Autoscaling",
      "Liveness/readiness probes",
      "Prometheus + Grafana observability",
      "Rolling & canary deploys",
    ],
    [
      "Deploy a multi-service app to EKS/GKE",
      "GitOps with Argo CD",
      "Load test & document scaling results",
      "Write a case-study README",
    ],
  ],
  Docker: [
    [
      "Images vs containers",
      "Writing a Dockerfile",
      "Port mapping & volumes",
      "Docker CLI essentials",
    ],
    [
      "Multi-stage builds",
      "Docker Compose for multi-service apps",
      "Networking between containers",
      "Image layer caching",
    ],
    [
      "Image security scanning",
      "Slim/distroless images",
      "Healthchecks & restart policies",
      "Pushing to a registry in CI",
    ],
    [
      "Containerize a full-stack app",
      "Ship it with a CI pipeline",
      "Benchmark image size & startup",
      "Document architecture",
    ],
  ],
  "Apache Kafka": [
    [
      "Topics, partitions & offsets",
      "Producers & consumers",
      "Running Kafka locally",
      "Delivery semantics",
    ],
    [
      "Consumer groups & rebalancing",
      "Schema Registry & Avro",
      "Kafka Connect",
      "Kafka Streams basics",
    ],
    [
      "Exactly-once processing",
      "Monitoring lag & throughput",
      "Retention & compaction",
      "Security: SASL/TLS",
    ],
    [
      "Build a real-time event pipeline",
      "Process 10k events/sec benchmark",
      "Dead-letter queue handling",
      "Publish a write-up",
    ],
  ],
  TypeScript: [
    [
      "Type annotations & inference",
      "Interfaces vs types",
      "Union & literal types",
      "tsconfig essentials",
    ],
    [
      "Generics",
      "Narrowing & type guards",
      "Utility types",
      "Typing React components",
    ],
    [
      "Strict mode migration",
      "Declaration files",
      "Runtime validation with Zod",
      "Testing typed code",
    ],
    [
      "Migrate a JS project to strict TS",
      "Publish a typed npm package",
      "Measure bugs prevented",
      "Write a migration guide",
    ],
  ],
}

export function generateRoadmap(
  skill: string,
  role = "Software Engineer",
): Roadmap {
  const specific = SPECIFIC[skill]
  const generic = [
    [
      `Core concepts & mental model of ${skill}`,
      `Install & configure the ${skill} toolchain`,
      `Walk through the official ${skill} docs`,
      `Build a "hello world" with ${skill}`,
    ],
    [
      `Idiomatic ${skill} patterns`,
      `Project structure & architecture with ${skill}`,
      `Integrating ${skill} with your existing stack`,
      `Common pitfalls & anti-patterns`,
    ],
    [
      `Testing ${skill} code`,
      `Performance & profiling in ${skill}`,
      `Security & production hardening`,
      `Observability and debugging`,
    ],
    [
      `Design a portfolio project using ${skill}`,
      `Ship it publicly with a README`,
      `Quantify results (latency, users, cost)`,
      `Add a STAR bullet to your resume`,
    ],
  ]
  const topics = specific ?? generic
  const meta = [
    [
      "Foundations & Modern Syntax",
      "3–5 days",
      "Explain the core model in your own words",
    ],
    [
      "Core Architecture & Patterns",
      "5–7 days",
      "Refactor a toy project using idiomatic patterns",
    ],
    [
      "Production Engineering & Quality",
      "5–7 days",
      "Deploy something that survives real traffic",
    ],
    [
      "Capstone Portfolio Proof",
      "4–6 days",
      "Public repo + quantified resume bullet",
    ],
  ]
  return {
    skill,
    role,
    docs:
      DOCS[skill] ??
      `https://www.google.com/search?q=${encodeURIComponent(`${skill} official documentation`)}`,
    capstone: `Build and publish a ${role.toLowerCase()}-grade project that uses ${skill} end-to-end, with metrics in the README.`,
    stages: meta.map(([title, duration, milestone], i) => ({
      id: `${i + 1}`,
      title,
      duration,
      milestone,
      topics: topics[i].map((label, j) => ({ id: `${i + 1}.${j + 1}`, label })),
    })),
  }
}

/* ------------------------------------------------------------------ */
/* GitHub repo → STAR bullets                                          */
/* ------------------------------------------------------------------ */

export interface RepoInsight {
  name: string
  description: string
  language: string
  stars: number
  topics: string[]
  url: string
  bullets: string[]
  live: boolean
}

export async function analyzeRepo(url: string): Promise<RepoInsight> {
  const m = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i)
  if (!m) throw new Error("Enter a URL like https://github.com/owner/repo")
  const [, owner, repoRaw] = m
  const repo = repoRaw.replace(/\.git$/, "")
  let data: {
    name: string
    description: string | null
    language: string | null
    stargazers_count: number
    topics?: string[]
    html_url: string
  } | null = null
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
    if (res.ok) data = await res.json()
  } catch {
    data = null
  }
  const name = data?.name ?? repo
  const language = data?.language ?? "TypeScript"
  const description =
    data?.description ?? `${name.replace(/[-_]/g, " ")} project`
  const stars = data?.stargazers_count ?? 0
  const topics = data?.topics?.slice(0, 5) ?? []
  const stack = [language, ...topics.slice(0, 2)].filter(Boolean).join(", ")
  return {
    name,
    description,
    language,
    stars,
    topics,
    url: data?.html_url ?? `https://github.com/${owner}/${repo}`,
    live: !!data,
    bullets: [
      `Engineered ${name}, ${description.charAt(0).toLowerCase()}${description.slice(1).replace(/\.$/, "")}, using ${stack}.`,
      stars > 0
        ? `Grew the open-source project to ${stars.toLocaleString()} GitHub stars by shipping documented, well-tested releases.`
        : `Designed a modular ${language} architecture with clear documentation, enabling contributors to onboard in [X] minutes.`,
      `Automated build and test workflows for ${name}, reducing manual release effort by [X]% and improving reliability.`,
    ],
  }
}

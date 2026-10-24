import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router"
import {
  Award,
  Bold,
  Check,
  Download,
  FolderGit2,
  Globe,
  Italic,
  Link as LinkIcon,
  LoaderCircle,
  Minus,
  Plus,
  Printer,
  Save,
  Sparkles,
  Star,
  Table as TableIcon,
  Trash2,
  Underline,
  Upload,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react"
import { Bar, Button, Label, Modal, PageHeader, cx } from "../components/ui"
import { createResume, download, draftToText } from "../lib/actions"
import { api, getToken } from "../lib/api"
import {
  analyzeRepo,
  improveBullet,
  parseResume,
  type RepoInsight,
} from "../lib/engine"
import {
  builderDraftToStructured,
  mapBackendResumeToDoc,
  structuredToBuilderDraft,
  uid,
  useUserData,
  type BuilderDraft,
  type Entry,
} from "../lib/store"

type ListKey = "experience" | "projects" | "education"
const TABS = [
  "Contact",
  "Summary",
  "Experience",
  "Projects",
  "Education",
  "Skills",
  "Extras",
] as const

const SUMMARY_TEMPLATES = [
  {
    label: "Full-Stack & Cloud",
    text: "Results-driven **Full-Stack & Cloud Software Engineer** with proven expertise in architecting high-throughput **Python/FastAPI** microservices, modern **React/TypeScript** interfaces, and containerized **AWS/Docker** infrastructure.",
  },
  {
    label: "AI & ML",
    text: "**AI & Machine Learning Engineer** specializing in **Large Language Models (LLMs)**, **RAG**, and scalable NLP pipelines, bridging research models with low-latency production services.",
  },
  {
    label: "Backend Systems",
    text: "**Backend Software Engineer** focused on distributed systems, event-driven architectures, and relational database optimization with **99.9%+** service reliability.",
  },
  {
    label: "Graduate / Entry",
    text: "Detail-oriented **Computer Science graduate** with strong foundations in data structures, system design, and full-stack cloud applications using **Python, React, PostgreSQL, and Docker**.",
  },
]

const SKILL_CATEGORY_MAP: Record<string, string[]> = {
  "Programming Languages": [
    "python",
    "javascript",
    "typescript",
    "java",
    "c++",
    "c#",
    "go",
    "golang",
    "rust",
    "ruby",
    "php",
    "swift",
    "kotlin",
    "sql",
    "html",
    "css",
    "bash",
    "shell",
    "r",
    "scala",
    "dart",
  ],
  "Frameworks & Libraries": [
    "react",
    "next.js",
    "nextjs",
    "vue.js",
    "vue",
    "angular",
    "fastapi",
    "django",
    "flask",
    "express",
    "node.js",
    "spring boot",
    ".net",
    "flutter",
    "react native",
    "redux",
    "tailwind css",
    "pandas",
    "numpy",
    "scikit-learn",
    "pytorch",
    "tensorflow",
    "graphql",
  ],
  "Databases & Storage": [
    "postgresql",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "sqlite",
    "cassandra",
    "dynamodb",
    "elasticsearch",
    "snowflake",
  ],
  "Cloud & DevOps": [
    "aws",
    "microsoft azure",
    "azure",
    "google cloud",
    "gcp",
    "docker",
    "kubernetes",
    "k8s",
    "ci/cd",
    "github actions",
    "jenkins",
    "terraform",
    "ansible",
    "linux",
    "nginx",
  ],
}

function autoCategorizeSkills(flatSkillsStr: string) {
  const items = flatSkillsStr
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const buckets: Record<string, string[]> = {
    "Programming Languages": [],
    "Frameworks & Libraries": [],
    "Databases & Storage": [],
    "Cloud & DevOps": [],
    "AI, Architecture & Tools": [],
  }
  for (const sk of items) {
    const low = sk.toLowerCase()
    let matched = "AI, Architecture & Tools"
    for (const [cat, list] of Object.entries(SKILL_CATEGORY_MAP)) {
      if (list.includes(low)) {
        matched = cat
        break
      }
    }
    if (!buckets[matched].includes(sk)) buckets[matched].push(sk)
  }
  return Object.entries(buckets)
    .filter(([, arr]) => arr.length > 0)
    .map(([category, skills]) => ({ category, skills }))
}

function renderRichText(text?: string): ReactNode {
  if (!text) return null
  const parts = String(text).split(/(\*\*.*?\*\*|__.*?__|<u>.*?<\/u>|\*[^*]+?\*)/gi)
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return (
        <u key={idx} className="underline">
          {part.slice(2, -2)}
        </u>
      )
    }
    if (
      part.toLowerCase().startsWith("<u>") &&
      part.toLowerCase().endsWith("</u>")
    ) {
      return (
        <u key={idx} className="underline">
          {part.slice(3, -4)}
        </u>
      )
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

function wrapInlineFormat(
  currentValue: string,
  onChange: (v: string) => void,
  format: "bold" | "italic" | "underline",
  elId?: string,
) {
  const marker =
    format === "bold" ? "**" : format === "italic" ? "*" : "__"
  const el = elId
    ? (document.getElementById(elId) as HTMLTextAreaElement | null)
    : null
  if (
    el &&
    typeof el.selectionStart === "number" &&
    el.selectionStart !== el.selectionEnd
  ) {
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = currentValue.slice(start, end)
    onChange(
      currentValue.slice(0, start) +
        `${marker}${selected}${marker}` +
        currentValue.slice(end),
    )
    return
  }
  if (currentValue.trim()) {
    onChange(`${marker}${currentValue.trim()}${marker}`)
  } else {
    onChange(`${marker}metric${marker}`)
  }
}

function Input({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field"
      />
    </div>
  )
}

function EntryEditor({
  list,
  kind,
  onChange,
  onImprove,
}: {
  list: Entry[]
  kind: ListKey
  onChange: (l: Entry[]) => void
  onImprove: (entryId: string, idx: number, text: string) => void
}) {
  const labels = {
    experience: ["Role", "Company"],
    projects: ["Project", "Tech stack"],
    education: ["Degree & major", "Institution"],
  }[kind]
  const set = (id: string, patch: Partial<Entry>) =>
    onChange(list.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-5">
      {list.map((e, i) => (
        <div key={e.id} className="border border-fg/12 bg-fg/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/45">
              {kind} {i + 1}
            </span>
            <button
              onClick={() => onChange(list.filter((x) => x.id !== e.id))}
              className="p-1 text-fg/40 hover:text-accent"
              aria-label="Remove entry"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id={`${e.id}-t`}
              label={labels[0]}
              value={e.title}
              onChange={(v) => set(e.id, { title: v })}
            />
            <Input
              id={`${e.id}-o`}
              label={labels[1]}
              value={e.org}
              onChange={(v) => set(e.id, { org: v })}
            />
            <Input
              id={`${e.id}-p`}
              label="Period"
              value={e.period}
              onChange={(v) => set(e.id, { period: v })}
              placeholder="2022 – Present"
            />
            {kind === "experience" && (
              <Input
                id={`${e.id}-loc`}
                label="Location"
                value={e.location ?? ""}
                onChange={(v) => set(e.id, { location: v })}
                placeholder="San Francisco, CA"
              />
            )}
            {kind === "projects" && (
              <Input
                id={`${e.id}-l`}
                label="GitHub / Link"
                value={e.link ?? ""}
                onChange={(v) => set(e.id, { link: v })}
                placeholder="github.com/you/repo"
              />
            )}
            {kind === "education" && (
              <Input
                id={`${e.id}-gpa`}
                label="GPA / Honors"
                value={e.gpa ?? ""}
                onChange={(v) => set(e.id, { gpa: v })}
                placeholder="3.85 / 4.0"
              />
            )}
          </div>
          {kind !== "education" && (
            <div className="mt-4 space-y-2">
              <Label>Bullets</Label>
              {e.bullets.map((b, bi) => {
                const bId = `bullet-${e.id}-${bi}`
                const updateBullet = (val: string) =>
                  set(e.id, {
                    bullets: e.bullets.map((x, xi) => (xi === bi ? val : x)),
                  })
                return (
                  <div key={bi} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          wrapInlineFormat(b, updateBullet, "bold", bId)
                        }
                        className="border border-fg/15 px-1.5 py-0.5 font-grid text-[10px] text-fg/60 hover:border-fg hover:text-fg"
                        title="Bold (**text**)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          wrapInlineFormat(b, updateBullet, "italic", bId)
                        }
                        className="border border-fg/15 px-1.5 py-0.5 font-serif text-[10px] italic text-fg/60 hover:border-fg hover:text-fg"
                        title="Italic (*text*)"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          wrapInlineFormat(b, updateBullet, "underline", bId)
                        }
                        className="border border-fg/15 px-1.5 py-0.5 font-grid text-[10px] underline text-fg/60 hover:border-fg hover:text-fg"
                        title="Underline (__text__)"
                      >
                        U
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        id={bId}
                        value={b}
                        rows={2}
                        onChange={(ev) => updateBullet(ev.target.value)}
                        className="field resize-y py-2 text-sm"
                        placeholder="Action verb + what you built + **measurable result**"
                        aria-label={`Bullet ${bi + 1}`}
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => onImprove(e.id, bi, b)}
                          disabled={!b.trim()}
                          className="border border-fg/15 p-2 text-accent hover:border-accent disabled:opacity-30"
                          title="Improve with STAR AI"
                          aria-label="Improve bullet"
                        >
                          <WandSparkles size={15} />
                        </button>
                        <button
                          onClick={() =>
                            set(e.id, {
                              bullets: e.bullets.filter((_, xi) => xi !== bi),
                            })
                          }
                          className="border border-fg/15 p-2 text-fg/40 hover:text-fg"
                          aria-label="Remove bullet"
                        >
                          <Minus size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => set(e.id, { bullets: [...e.bullets, ""] })}
                className="inline-flex items-center gap-1.5 font-grid text-sm text-fg/60 hover:text-fg"
              >
                <Plus size={14} /> Add bullet
              </button>
            </div>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange([
            ...list,
            {
              id: uid(),
              title: "",
              org: "",
              period: "",
              bullets: kind === "education" ? [] : [""],
            },
          ])
        }
      >
        <Plus size={15} /> Add{" "}
        {kind === "experience"
          ? "role"
          : kind === "projects"
            ? "project"
            : "education"}
      </Button>
    </div>
  )
}

interface SecProps {
  title: string
  accentColor?: string
  children: ReactNode
}

function Sec({ title, accentColor, children }: SecProps) {
  return (
    <section className="mt-5">
      <h2
        className="border-b border-ink/25 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/85"
        style={
          accentColor
            ? { color: accentColor, borderColor: accentColor }
            : undefined
        }
      >
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Preview({ d }: { d: BuilderDraft }) {
  const st = d.styleSettings
  const accent = st?.accent_color
  const fontClass =
    st?.font_family === "serif"
      ? "font-serif"
      : st?.font_family === "mono"
        ? "font-mono"
        : "font-[Arial,Helvetica,sans-serif]"
  const sizeClass =
    st?.font_size === "compact"
      ? "text-[11px]"
      : st?.font_size === "comfortable"
        ? "text-[13px]"
        : "text-[12px]"
  const leadClass =
    st?.line_spacing === "tight"
      ? "leading-tight"
      : st?.line_spacing === "relaxed"
        ? "leading-relaxed"
        : "leading-snug"

  const contact = [
    d.email,
    d.phone,
    d.location,
    d.linkedin,
    d.github,
    d.portfolio,
    ...(d.customLinks ?? [])
      .filter((l) => l.url)
      .map((l) => `${l.label || "Link"}: ${l.url}`),
  ].filter(Boolean)

  const list = (items: Entry[]) =>
    items
      .filter((e) => e.title || e.org)
      .map((e) => (
        <div key={e.id} className="mb-3">
          <div className="flex justify-between gap-4 text-[12.5px]">
            <span>
              <b>{e.title}</b>
              {e.org && <span className="text-ink/65"> — {e.org}</span>}
              {e.location && (
                <span className="text-ink/55"> · {e.location}</span>
              )}
              {e.gpa && <span className="text-ink/65"> · GPA: {e.gpa}</span>}
            </span>
            <span className="shrink-0 text-ink/55">{e.period}</span>
          </div>
          {e.link && <div className="text-[11px] text-ink/55">{e.link}</div>}
          {e.bullets.some((b) => b.trim()) && (
            <ul
              className={cx(
                "mt-1 list-disc space-y-0.5 pl-4 text-ink/85",
                sizeClass,
                leadClass,
              )}
            >
              {e.bullets
                .filter((b) => b.trim())
                .map((b, i) => (
                  <li key={i}>{renderRichText(b)}</li>
                ))}
            </ul>
          )}
        </div>
      ))

  const hasSkillCats =
    d.skillCategories &&
    d.skillCategories.some((c) => c.category && c.skills?.length > 0)

  return (
    <div
      id="print-area"
      className={cx(
        "min-h-[1000px] bg-bone px-10 py-10 text-ink shadow-[0_30px_80px_-20px_color-mix(in_oklab,var(--color-ink)_55%,transparent)]",
        fontClass,
      )}
    >
      <h1 className="text-[24px] font-bold leading-tight">
        {d.name || "Your Name"}
      </h1>
      {d.designation && (
        <div
          className="mt-0.5 text-[12.5px] font-semibold"
          style={accent ? { color: accent } : undefined}
        >
          {d.designation}
        </div>
      )}
      {contact.length > 0 && (
        <div className="mt-1 text-[11.5px] text-ink/65">
          {contact.join("  |  ")}
        </div>
      )}
      {d.summary.trim() && (
        <Sec title="Summary" accentColor={accent}>
          <p className={cx(sizeClass, leadClass)}>
            {renderRichText(d.summary)}
          </p>
        </Sec>
      )}
      {d.experience.some((e) => e.title || e.org) && (
        <Sec title="Experience" accentColor={accent}>
          {list(d.experience)}
        </Sec>
      )}
      {d.projects.some((e) => e.title || e.org) && (
        <Sec title="Projects" accentColor={accent}>
          {list(d.projects)}
        </Sec>
      )}
      {d.education.some((e) => e.title || e.org) && (
        <Sec title="Education" accentColor={accent}>
          {list(d.education)}
        </Sec>
      )}
      {(hasSkillCats || d.skills.trim()) && (
        <Sec title="Skills" accentColor={accent}>
          {hasSkillCats ? (
            d.skillsDisplayMode === "table" ? (
              <table className="w-full border-collapse border border-ink/20 text-[11.5px]">
                <tbody>
                  {d
                    .skillCategories!.filter((c) => c.skills?.length)
                    .map((c, idx) => (
                      <tr key={idx} className="border-b border-ink/15">
                        <td className="w-1/3 bg-ink/[0.04] px-2.5 py-1.5 font-bold">
                          {c.category}
                        </td>
                        <td className="px-2.5 py-1.5">
                          {c.skills.join(", ")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="space-y-1">
                {d
                  .skillCategories!.filter((c) => c.skills?.length)
                  .map((c, idx) => (
                    <p key={idx} className={cx(sizeClass, leadClass)}>
                      <b>{c.category}:</b> {c.skills.join(", ")}
                    </p>
                  ))}
              </div>
            )
          ) : (
            <p className={cx(sizeClass, leadClass)}>{d.skills}</p>
          )}
        </Sec>
      )}
      {d.customTables &&
        d.customTables.map((tbl, tIdx) => (
          <Sec
            key={tIdx}
            title={tbl.title || "Additional Matrix"}
            accentColor={accent}
          >
            <table className="w-full border-collapse border border-ink/20 text-[11.5px]">
              {tbl.headers.length > 0 && (
                <thead>
                  <tr className="border-b border-ink/20 bg-ink/[0.05]">
                    {tbl.headers.map((h, hi) => (
                      <th key={hi} className="px-2.5 py-1.5 text-left font-bold">
                        {renderRichText(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tbl.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-ink/15">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2.5 py-1.5">
                        {renderRichText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Sec>
        ))}
      {d.certifications && d.certifications.some((c) => c.name) && (
        <Sec title="Certifications & Honors" accentColor={accent}>
          <ul className={cx("list-disc space-y-0.5 pl-4", sizeClass)}>
            {d.certifications
              .filter((c) => c.name)
              .map((c, ci) => (
                <li key={ci}>
                  <b>{c.name}</b>
                  {c.issuer ? ` — ${c.issuer}` : ""}
                  {c.date ? ` (${c.date})` : ""}
                </li>
              ))}
          </ul>
        </Sec>
      )}
      {d.languages && d.languages.some((l) => l.language) && (
        <Sec title="Languages" accentColor={accent}>
          <p className={sizeClass}>
            {d.languages
              .filter((l) => l.language)
              .map((l) => `${l.language} (${l.proficiency || "Professional"})`)
              .join("  •  ")}
          </p>
        </Sec>
      )}
    </div>
  )
}

export default function Builder() {
  const { data, update, taxonomy, user, refreshFromBackend } = useUserData()
  const navigate = useNavigate()
  const d = data.draft
  const [tab, setTab] = useState<typeof TABS[number]>("Experience")
  const [improve, setImprove] = useState<{
    entryId: string
    idx: number
    text: string
  } | null>(null)
  const [aiBulletLoading, setAiBulletLoading] = useState(false)
  const [aiBulletResult, setAiBulletResult] = useState<{
    suggested: string
    changes: string
  } | null>(null)
  const [editedAiBullet, setEditedAiBullet] = useState("")

  const [repoOpen, setRepoOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState("")
  const [repo, setRepo] = useState<RepoInsight | null>(null)
  const [repoBusy, setRepoBusy] = useState(false)
  const [repoErr, setRepoErr] = useState("")
  const [saved, setSaved] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // AI Auto-format & Messy Text Fixer state
  const [autoFormatting, setAutoFormatting] = useState(false)
  const [fixesBanner, setFixesBanner] = useState<string[]>([])
  const [messyOpen, setMessyOpen] = useState(false)
  const [messyText, setMessyText] = useState("")

  const setDraft = (patch: Partial<BuilderDraft>) =>
    update((x) => ({ ...x, draft: { ...x.draft, ...patch } }))
  const text = useMemo(() => draftToText(d), [d])
  const ats = useMemo(() => parseResume(text, taxonomy), [text, taxonomy])
  const suggestions = useMemo(
    () => (improve ? improveBullet(improve.text) : []),
    [improve],
  )

  const openImproveModal = async (
    entryId: string,
    idx: number,
    bulletText: string,
  ) => {
    setImprove({ entryId, idx, text: bulletText })
    setAiBulletResult(null)
    setEditedAiBullet(improveBullet(bulletText)[0] ?? bulletText)

    if (getToken()) {
      setAiBulletLoading(true)
      try {
        const expEntry = d.experience.find((e) => e.id === entryId)
        const projEntry = d.projects.find((e) => e.id === entryId)
        const roleContext =
          expEntry?.title ||
          projEntry?.title ||
          d.designation ||
          "Software Engineer"
        const firstSkill =
          d.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)[0] || "Python"

        const res = await api.suggestBullets({
          raw_bullet: bulletText,
          target_skill: firstSkill,
          role_context: roleContext,
        })
        setAiBulletResult({
          suggested: res.suggested_bullet,
          changes: res.changes_explained,
        })
        setEditedAiBullet(res.suggested_bullet)
      } catch {
        // local suggestions already available
      } finally {
        setAiBulletLoading(false)
      }
    }
  }

  const applyBullet = (b: string) => {
    if (!improve) return
    const key: ListKey = d.experience.some((e) => e.id === improve.entryId)
      ? "experience"
      : "projects"
    setDraft({
      [key]: d[key].map((e) =>
        e.id === improve.entryId
          ? {
              ...e,
              bullets: e.bullets.map((x, i) => (i === improve.idx ? b : x)),
            }
          : e,
      ),
    })
    setImprove(null)
  }

  const fetchRepo = async (e: FormEvent) => {
    e.preventDefault()
    setRepoErr("")
    setRepo(null)
    setRepoBusy(true)
    try {
      if (getToken()) {
        try {
          const res = await api.analyzeRepo(repoUrl)
          setRepo({
            name: res.title,
            description:
              res.description || `${res.title} open-source repository`,
            language: res.language || res.technologies[0] || "TypeScript",
            stars: res.stars ?? 0,
            topics: res.technologies.slice(1),
            url: res.repo_url,
            bullets: res.bullets,
            live: true,
          })
          return
        } catch {
          // fallback to client GitHub fetch
        }
      }
      setRepo(await analyzeRepo(repoUrl))
    } catch (err) {
      setRepoErr((err as Error).message)
    } finally {
      setRepoBusy(false)
    }
  }

  const importRepo = () => {
    if (!repo) return
    setDraft({
      projects: [
        ...d.projects,
        {
          id: uid(),
          title: repo.name,
          org: [repo.language, ...repo.topics.slice(0, 3)]
            .filter(Boolean)
            .join(", "),
          period: String(new Date().getFullYear()),
          link: repo.url.replace(/^https?:\/\//, ""),
          bullets: repo.bullets,
        },
      ],
    })
    setRepoOpen(false)
    setRepo(null)
    setRepoUrl("")
    setTab("Projects")
  }

  const saveAsResume = async (): Promise<string | null> => {
    const resumeTitle = d.title || `${d.name || "Builder"} — Builder draft`
    const structured = builderDraftToStructured(
      d,
      text,
      ats.atsScore,
      ats.skills,
    )

    if (getToken()) {
      try {
        const res = d.activeResumeId
          ? await api.updateResume(d.activeResumeId, resumeTitle, structured)
          : await api.createResume(resumeTitle, structured)
        const doc = mapBackendResumeToDoc(res, taxonomy)
        update((x) => ({
          ...x,
          draft: { ...x.draft, activeResumeId: res.id },
          resumes: [doc, ...x.resumes.filter((r) => r.id !== doc.id)],
        }))
        setSaved(true)
        setTimeout(() => setSaved(false), 2200)
        return res.id
      } catch {
        // fallback to local
      }
    }

    const doc = createResume(text, resumeTitle, "builder", taxonomy)
    update((x) => ({ ...x, resumes: [doc, ...x.resumes] }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
    return doc.id
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      const savedId = await saveAsResume()
      const targetId = savedId || d.activeResumeId
      if (targetId && getToken()) {
        await api.exportResumePdf(
          targetId,
          `${(d.name || "resume").replace(/\s+/g, "_")}_ATS.pdf`,
        )
        return
      }
    } catch {
      // fallback to print dialog
    } finally {
      setExportingPdf(false)
    }
    window.print()
  }

  const handleAutoFormat = async (rawMessyOverride?: string) => {
    setAutoFormatting(true)
    setFixesBanner([])
    try {
      const currentStructured = builderDraftToStructured(
        d,
        text,
        ats.atsScore,
        ats.skills,
      )
      const res = await api.autoFormatResume({
        structured_json: currentStructured,
        raw_messy_text: rawMessyOverride || null,
        target_role: d.designation || "Software Engineer",
      })
      if (res.structured_json) {
        const nextDraft = structuredToBuilderDraft(
          res.structured_json,
          d.name || user.name,
          d.email || user.email,
          d.activeResumeId,
          d.title,
        )
        setDraft(nextDraft)
      }
      if (res.fixes_applied?.length) {
        setFixesBanner(res.fixes_applied)
      }
      setMessyOpen(false)
      setMessyText("")
    } catch {
      // Deterministic local cleanup fallback
      const cats = autoCategorizeSkills(d.skills)
      setDraft({ skillCategories: cats })
      setFixesBanner([
        "Standardized skill categories and normalized bullet punctuation for single-column ATS parsing.",
      ])
    } finally {
      setAutoFormatting(false)
    }
  }

  const handleImportFromMasterProfile = async () => {
    let mp = data.masterProfile
    if (getToken() && !mp) {
      try {
        mp = await api.getProfile()
      } catch {
        // ignore
      }
    }
    if (mp) {
      const skillsStr =
        mp.user_skills?.map((s) => s.skill_name).filter(Boolean).join(", ") ||
        d.skills
      setDraft({
        name: user.name || d.name,
        designation: mp.headline || d.designation,
        email: user.email || d.email,
        phone: mp.phone || d.phone,
        location: mp.location || d.location,
        linkedin: mp.linkedin_url || d.linkedin,
        github: mp.github_url || d.github,
        portfolio: mp.portfolio_url || d.portfolio,
        summary: mp.summary || d.summary,
        skills: skillsStr,
        skillCategories: autoCategorizeSkills(skillsStr),
        experience:
          mp.experiences && mp.experiences.length > 0
            ? mp.experiences.map((e) => ({
                id: e.id || uid(),
                title: e.role_title,
                org: e.company,
                location: e.location ?? "",
                period: [e.start_date, e.is_current ? "Present" : e.end_date]
                  .filter(Boolean)
                  .join(" – "),
                bullets: e.bullets?.length ? e.bullets : [""],
              }))
            : d.experience,
        projects:
          mp.projects && mp.projects.length > 0
            ? mp.projects.map((p) => ({
                id: p.id || uid(),
                title: p.title,
                org: (p.technologies || []).join(", "),
                period: "",
                link: p.repo_url ?? "",
                liveUrl: p.live_url ?? "",
                bullets: p.description ? [p.description] : [""],
              }))
            : d.projects,
        education:
          mp.educations && mp.educations.length > 0
            ? mp.educations.map((ed) => ({
                id: ed.id || uid(),
                title: [ed.degree, ed.field_of_study]
                  .filter(Boolean)
                  .join(" in "),
                org: ed.institution,
                period: [ed.start_date, ed.end_date].filter(Boolean).join(" – "),
                gpa: ed.gpa ?? "",
                bullets: [],
              }))
            : d.education,
      })
      refreshFromBackend()
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Resume builder"
        title="Build an ATS-safe resume"
        desc="Single-column, standard headings, rich text styling and server-side ReportLab PDF generation. Changes save automatically."
        actions={
          <>
            <Button
              variant="ghost"
              disabled={autoFormatting}
              onClick={() => handleAutoFormat()}
              title="AI auto-fixes casing, dates, skill categories, and STAR bullet metrics"
            >
              {autoFormatting ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <WandSparkles size={16} />
              )}{" "}
              AI Auto-Fix
            </Button>
            <Button variant="ghost" onClick={() => setMessyOpen(true)}>
              <Sparkles size={16} /> Fix messy text
            </Button>
            <Button variant="ghost" onClick={() => setRepoOpen(true)}>
              <FolderGit2 size={17} /> Import GitHub repo
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                download(
                  `${(d.name || "resume").replace(/\s+/g, "-").toLowerCase()}.txt`,
                  text,
                )
              }
            >
              <Download size={17} /> .txt
            </Button>
            <Button
              variant="primary"
              disabled={exportingPdf}
              onClick={handleExportPdf}
            >
              {exportingPdf ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Printer size={17} />
              )}{" "}
              Export ATS PDF
            </Button>
          </>
        }
      />

      {fixesBanner.length > 0 && (
        <div className="mb-6 border border-accent/40 bg-accent/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-grid text-xs uppercase tracking-[0.16em] text-accent">
              <Check size={15} /> AI formatting adjustments applied (
              {fixesBanner.length})
            </span>
            <button
              type="button"
              onClick={() => setFixesBanner([])}
              className="p-1 text-fg/50 hover:text-fg"
            >
              <X size={15} />
            </button>
          </div>
          <ul className="mt-2 grid gap-1.5 text-xs text-fg/80 md:grid-cols-2">
            {fixesBanner.map((f, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-accent">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Typography, Layout & Quick Load Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-fg/12 bg-surface/60 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-grid uppercase tracking-[0.14em] text-fg/50">
              Font
            </span>
            <select
              value={d.styleSettings?.font_family || "sans"}
              onChange={(e) =>
                setDraft({
                  styleSettings: {
                    ...(d.styleSettings ?? {
                      font_family: "sans",
                      font_size: "standard",
                      line_spacing: "normal",
                      accent_color: "#1E3A8A",
                    }),
                    font_family: e.target.value as any,
                  },
                })
              }
              className="border border-fg/15 bg-surface px-2 py-1 font-grid text-xs"
            >
              <option value="sans">Sans (Helvetica)</option>
              <option value="serif">Serif (Times)</option>
              <option value="mono">Mono (Courier)</option>
              <option value="calibri">Corporate (Calibri)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-grid uppercase tracking-[0.14em] text-fg/50">
              Size
            </span>
            <select
              value={d.styleSettings?.font_size || "standard"}
              onChange={(e) =>
                setDraft({
                  styleSettings: {
                    ...(d.styleSettings ?? {
                      font_family: "sans",
                      font_size: "standard",
                      line_spacing: "normal",
                      accent_color: "#1E3A8A",
                    }),
                    font_size: e.target.value as any,
                  },
                })
              }
              className="border border-fg/15 bg-surface px-2 py-1 font-grid text-xs"
            >
              <option value="compact">Compact (10pt)</option>
              <option value="standard">Standard (11pt)</option>
              <option value="comfortable">Large (12pt)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-grid uppercase tracking-[0.14em] text-fg/50">
              Skills layout
            </span>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  skillsDisplayMode:
                    d.skillsDisplayMode === "table" ? "rows" : "table",
                })
              }
              className="border border-fg/15 bg-surface px-2.5 py-1 font-grid text-xs hover:border-accent"
            >
              {d.skillsDisplayMode === "table" ? "Table grid" : "Inline rows"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.resumes.length > 0 && (
            <select
              value={d.activeResumeId || ""}
              onChange={(e) => {
                const found = data.resumes.find((r) => r.id === e.target.value)
                if (found?.structured) {
                  setDraft(
                    structuredToBuilderDraft(
                      found.structured,
                      user.name,
                      user.email,
                      found.id,
                      found.title,
                    ),
                  )
                }
              }}
              aria-label="Load saved resume"
              className="border border-fg/15 bg-surface px-2.5 py-1 font-grid text-xs"
            >
              <option value="">Load saved resume…</option>
              {data.resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleImportFromMasterProfile}
            className="inline-flex items-center gap-1 border border-fg/15 px-2.5 py-1 font-grid text-xs text-fg/70 hover:border-accent hover:text-accent"
          >
            <UserRound size={12} /> From Master Profile
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-4 flex gap-px overflow-x-auto bg-fg/10 scroll-thin">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx(
                  "flex-1 whitespace-nowrap px-4 py-2.5 font-grid text-sm transition-colors",
                  tab === t
                    ? "bg-accent text-canvas"
                    : "bg-surface text-fg/60 hover:text-fg",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="border border-fg/12 bg-surface/60 p-5">
            {tab === "Contact" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="b-doc-title"
                    label="Document title"
                    value={d.title ?? ""}
                    onChange={(v) => setDraft({ title: v })}
                    placeholder="Senior Full-Stack Resume"
                  />
                  <Input
                    id="b-desig"
                    label="Headline / designation"
                    value={d.designation ?? ""}
                    onChange={(v) => setDraft({ designation: v })}
                    placeholder="Senior Full-Stack Engineer"
                  />
                  <Input
                    id="b-name"
                    label="Full name"
                    value={d.name}
                    onChange={(v) => setDraft({ name: v })}
                  />
                  <Input
                    id="b-email"
                    label="Email"
                    value={d.email}
                    onChange={(v) => setDraft({ email: v })}
                  />
                  <Input
                    id="b-phone"
                    label="Phone"
                    value={d.phone}
                    onChange={(v) => setDraft({ phone: v })}
                  />
                  <Input
                    id="b-loc"
                    label="Location"
                    value={d.location}
                    onChange={(v) => setDraft({ location: v })}
                  />
                  <Input
                    id="b-li"
                    label="LinkedIn"
                    value={d.linkedin}
                    onChange={(v) => setDraft({ linkedin: v })}
                  />
                  <Input
                    id="b-gh"
                    label="GitHub"
                    value={d.github}
                    onChange={(v) => setDraft({ github: v })}
                  />
                  <Input
                    id="b-port"
                    label="Portfolio / Website"
                    value={d.portfolio ?? ""}
                    onChange={(v) => setDraft({ portfolio: v })}
                    placeholder="yourportfolio.dev"
                  />
                </div>

                <div className="border-t border-fg/10 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-grid text-xs uppercase tracking-[0.16em] text-fg/55">
                      <LinkIcon size={13} className="text-accent" /> Custom
                      links (LeetCode, Kaggle, Blog)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          customLinks: [
                            ...(d.customLinks ?? []),
                            { label: "LeetCode", url: "" },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 font-grid text-xs text-accent hover:underline"
                    >
                      <Plus size={13} /> Add link
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(d.customLinks ?? []).map((lnk, li) => (
                      <div key={li} className="flex gap-2">
                        <input
                          value={lnk.label}
                          onChange={(e) => {
                            const next = [...(d.customLinks ?? [])]
                            next[li] = { ...next[li], label: e.target.value }
                            setDraft({ customLinks: next })
                          }}
                          placeholder="Label"
                          className="field w-32 py-1.5 text-sm"
                        />
                        <input
                          value={lnk.url}
                          onChange={(e) => {
                            const next = [...(d.customLinks ?? [])]
                            next[li] = { ...next[li], url: e.target.value }
                            setDraft({ customLinks: next })
                          }}
                          placeholder="https://leetcode.com/u/username"
                          className="field flex-1 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              customLinks: (d.customLinks ?? []).filter(
                                (_, i) => i !== li,
                              ),
                            })
                          }
                          className="p-2 text-fg/40 hover:text-accent"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === "Summary" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="b-sum" hint={`${d.summary.length}/500`}>
                    Professional summary
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        wrapInlineFormat(
                          d.summary,
                          (v) => setDraft({ summary: v }),
                          "bold",
                          "b-sum",
                        )
                      }
                      className="border border-fg/15 p-1.5 text-fg/60 hover:border-fg hover:text-fg"
                      title="Bold selected text (**bold**)"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        wrapInlineFormat(
                          d.summary,
                          (v) => setDraft({ summary: v }),
                          "italic",
                          "b-sum",
                        )
                      }
                      className="border border-fg/15 p-1.5 text-fg/60 hover:border-fg hover:text-fg"
                      title="Italic (*italic*)"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        wrapInlineFormat(
                          d.summary,
                          (v) => setDraft({ summary: v }),
                          "underline",
                          "b-sum",
                        )
                      }
                      className="border border-fg/15 p-1.5 text-fg/60 hover:border-fg hover:text-fg"
                      title="Underline (__underline__)"
                    >
                      <Underline size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-grid text-[10px] uppercase tracking-[0.16em] text-fg/45">
                    Templates:
                  </span>
                  {SUMMARY_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => setDraft({ summary: tpl.text })}
                      className="border border-fg/15 px-2 py-1 font-grid text-xs text-fg/70 hover:border-accent hover:text-accent"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
                <textarea
                  id="b-sum"
                  rows={6}
                  maxLength={500}
                  value={d.summary}
                  onChange={(e) => setDraft({ summary: e.target.value })}
                  className="field"
                />
              </div>
            )}
            {tab === "Experience" && (
              <EntryEditor
                kind="experience"
                list={d.experience}
                onChange={(l) => setDraft({ experience: l })}
                onImprove={openImproveModal}
              />
            )}
            {tab === "Projects" && (
              <EntryEditor
                kind="projects"
                list={d.projects}
                onChange={(l) => setDraft({ projects: l })}
                onImprove={openImproveModal}
              />
            )}
            {tab === "Education" && (
              <EntryEditor
                kind="education"
                list={d.education}
                onChange={(l) => setDraft({ education: l })}
                onImprove={() => undefined}
              />
            )}
            {tab === "Skills" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="b-skills" hint="Comma separated">
                    Skills inventory
                  </Label>
                  <textarea
                    id="b-skills"
                    rows={4}
                    value={d.skills}
                    onChange={(e) => setDraft({ skills: e.target.value })}
                    className="field"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-fg/10 pt-4">
                  <span className="font-grid text-xs uppercase tracking-[0.16em] text-fg/60">
                    Categorized skill domains
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft({
                        skillCategories: autoCategorizeSkills(d.skills),
                      })
                    }
                  >
                    <Sparkles size={14} /> Auto-categorize skills
                  </Button>
                </div>
                {d.skillCategories && d.skillCategories.length > 0 && (
                  <div className="space-y-3">
                    {d.skillCategories.map((catObj, ci) => (
                      <div
                        key={ci}
                        className="border border-fg/12 bg-fg/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            value={catObj.category}
                            onChange={(e) => {
                              const next = [...(d.skillCategories ?? [])]
                              next[ci] = {
                                ...next[ci],
                                category: e.target.value,
                              }
                              setDraft({ skillCategories: next })
                            }}
                            className="bg-transparent font-grid text-sm font-medium outline-none focus:text-accent"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                skillCategories: (
                                  d.skillCategories ?? []
                                ).filter((_, i) => i !== ci),
                              })
                            }
                            className="p-1 text-fg/40 hover:text-accent"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          value={catObj.skills.join(", ")}
                          onChange={(e) => {
                            const next = [...(d.skillCategories ?? [])]
                            next[ci] = {
                              ...next[ci],
                              skills: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                            setDraft({ skillCategories: next })
                          }}
                          className="field mt-2 py-1.5 text-xs"
                          placeholder="Skills in this category, comma-separated"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === "Extras" && (
              <div className="space-y-6">
                {/* Certifications */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-grid text-xs uppercase tracking-[0.16em] text-fg/60">
                      <Award size={14} className="text-accent" /> Certifications
                      & honors
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          certifications: [
                            ...(d.certifications ?? []),
                            { name: "", issuer: "", date: "", url: "" },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 font-grid text-xs text-accent hover:underline"
                    >
                      <Plus size={13} /> Add certification
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {(d.certifications ?? []).map((c, ci) => (
                      <div
                        key={ci}
                        className="grid gap-2 border border-fg/12 bg-fg/[0.02] p-3 sm:grid-cols-3"
                      >
                        <input
                          value={c.name}
                          onChange={(e) => {
                            const next = [...(d.certifications ?? [])]
                            next[ci] = { ...next[ci], name: e.target.value }
                            setDraft({ certifications: next })
                          }}
                          placeholder="Certification name"
                          className="field py-1.5 text-xs sm:col-span-2"
                        />
                        <div className="flex gap-2">
                          <input
                            value={c.date}
                            onChange={(e) => {
                              const next = [...(d.certifications ?? [])]
                              next[ci] = { ...next[ci], date: e.target.value }
                              setDraft({ certifications: next })
                            }}
                            placeholder="Year (2025)"
                            className="field py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                certifications: (
                                  d.certifications ?? []
                                ).filter((_, i) => i !== ci),
                              })
                            }
                            className="p-1.5 text-fg/40 hover:text-accent"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          value={c.issuer}
                          onChange={(e) => {
                            const next = [...(d.certifications ?? [])]
                            next[ci] = { ...next[ci], issuer: e.target.value }
                            setDraft({ certifications: next })
                          }}
                          placeholder="Issuer (e.g. AWS)"
                          className="field py-1.5 text-xs sm:col-span-3"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spoken Languages */}
                <div className="border-t border-fg/10 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-grid text-xs uppercase tracking-[0.16em] text-fg/60">
                      <Globe size={14} className="text-accent" /> Spoken
                      languages
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          languages: [
                            ...(d.languages ?? []),
                            {
                              language: "",
                              proficiency: "Full Professional",
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 font-grid text-xs text-accent hover:underline"
                    >
                      <Plus size={13} /> Add language
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(d.languages ?? []).map((l, li) => (
                      <div key={li} className="flex gap-2">
                        <input
                          value={l.language}
                          onChange={(e) => {
                            const next = [...(d.languages ?? [])]
                            next[li] = { ...next[li], language: e.target.value }
                            setDraft({ languages: next })
                          }}
                          placeholder="Language (e.g. English)"
                          className="field flex-1 py-1.5 text-xs"
                        />
                        <input
                          value={l.proficiency}
                          onChange={(e) => {
                            const next = [...(d.languages ?? [])]
                            next[li] = {
                              ...next[li],
                              proficiency: e.target.value,
                            }
                            setDraft({ languages: next })
                          }}
                          placeholder="Proficiency"
                          className="field w-44 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              languages: (d.languages ?? []).filter(
                                (_, i) => i !== li,
                              ),
                            })
                          }
                          className="p-1.5 text-fg/40 hover:text-accent"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Tables */}
                <div className="border-t border-fg/10 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-grid text-xs uppercase tracking-[0.16em] text-fg/60">
                      <TableIcon size={14} className="text-accent" /> Custom
                      engineering tables
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          customTables: [
                            ...(d.customTables ?? []),
                            {
                              title: "Key Engineering Impact & Benchmarks",
                              headers: [
                                "System / Domain",
                                "Stack",
                                "Quantified Impact",
                              ],
                              rows: [
                                [
                                  "API Gateway",
                                  "FastAPI + Redis",
                                  "Reduced p99 latency by **38%**",
                                ],
                              ],
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 font-grid text-xs text-accent hover:underline"
                    >
                      <Plus size={13} /> Add table
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(d.customTables ?? []).map((tbl, ti) => (
                      <div
                        key={ti}
                        className="space-y-2.5 border border-fg/12 bg-fg/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            value={tbl.title}
                            onChange={(e) => {
                              const next = [...(d.customTables ?? [])]
                              next[ti] = { ...next[ti], title: e.target.value }
                              setDraft({ customTables: next })
                            }}
                            className="field py-1.5 font-grid text-xs font-medium"
                            placeholder="Table title"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                customTables: (d.customTables ?? []).filter(
                                  (_, i) => i !== ti,
                                ),
                              })
                            }
                            className="p-1.5 text-fg/40 hover:text-accent"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div
                          className="grid gap-1.5"
                          style={{
                            gridTemplateColumns: `repeat(${tbl.headers.length}, minmax(0, 1fr))`,
                          }}
                        >
                          {tbl.headers.map((h, hi) => (
                            <input
                              key={hi}
                              value={h}
                              onChange={(e) => {
                                const next = [...(d.customTables ?? [])]
                                const headers = [...next[ti].headers]
                                headers[hi] = e.target.value
                                next[ti] = { ...next[ti], headers }
                                setDraft({ customTables: next })
                              }}
                              className="field py-1 font-grid text-xs"
                            />
                          ))}
                        </div>
                        {tbl.rows.map((row, ri) => (
                          <div key={ri} className="flex items-center gap-1.5">
                            <div
                              className="grid flex-1 gap-1.5"
                              style={{
                                gridTemplateColumns: `repeat(${tbl.headers.length}, minmax(0, 1fr))`,
                              }}
                            >
                              {row.map((cell, ci) => (
                                <input
                                  key={ci}
                                  value={cell}
                                  onChange={(e) => {
                                    const next = [...(d.customTables ?? [])]
                                    const rows = next[ti].rows.map((r) => [...r])
                                    rows[ri][ci] = e.target.value
                                    next[ti] = { ...next[ti], rows }
                                    setDraft({ customTables: next })
                                  }}
                                  className="field py-1 text-xs"
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...(d.customTables ?? [])]
                                next[ti] = {
                                  ...next[ti],
                                  rows: next[ti].rows.filter(
                                    (_, idx) => idx !== ri,
                                  ),
                                }
                                setDraft({ customTables: next })
                              }}
                              className="p-1 text-fg/40 hover:text-accent"
                            >
                              <Minus size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...(d.customTables ?? [])]
                            next[ti] = {
                              ...next[ti],
                              rows: [
                                ...next[ti].rows,
                                Array(tbl.headers.length).fill(""),
                              ],
                            }
                            setDraft({ customTables: next })
                          }}
                          className="font-grid text-xs text-accent hover:underline"
                        >
                          + Add row
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-px bg-fg/10 sm:grid-cols-3">
            <div className="bg-surface p-4">
              <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
                ATS score
              </div>
              <div className="mt-1 font-grid text-2xl font-semibold">
                {ats.atsScore}
              </div>
              <Bar
                value={ats.atsScore}
                className="mt-2"
                tone={
                  ats.atsScore >= 75
                    ? "bg-fg"
                    : ats.atsScore >= 55
                      ? "bg-fg/50"
                      : "bg-accent"
                }
              />
            </div>
            <div className="bg-surface p-4">
              <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
                Quantified
              </div>
              <div className="mt-1 font-grid text-2xl font-semibold">
                {Math.round(ats.quantifiedRatio * 100)}%
              </div>
              <div className="mt-1 text-xs text-fg/45">target ≥ 60%</div>
            </div>
            <div className="flex flex-col justify-center gap-2 bg-surface p-4">
              <Button
                size="sm"
                variant={saved ? "white" : "primary"}
                onClick={saveAsResume}
              >
                <Save size={15} />{" "}
                {saved ? "Saved to resumes" : "Save as resume"}
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => navigate("/app/match")}
              >
                Match a job →
              </Button>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 font-grid text-[11px] uppercase tracking-[0.2em] text-fg/50">
            Live preview · Letter
          </div>
          <div className="xl:sticky xl:top-6">
            <Preview d={d} />
          </div>
        </div>
      </div>

      {/* STAR Bullet Optimizer Modal (Human-in-the-loop Accept / Edit / Reject) */}
      <Modal
        open={!!improve}
        onClose={() => setImprove(null)}
        title="STAR bullet optimizer"
      >
        <div className="mb-4 border border-fg/12 bg-fg/[0.03] p-4 text-sm text-fg/60">
          <div className="mb-1 font-grid text-[10px] uppercase tracking-[0.2em] text-fg/40">
            Original
          </div>
          {improve?.text}
        </div>

        <div className="mb-4">
          <Label
            htmlFor="star-edit"
            hint={
              aiBulletLoading
                ? "Generating AI refinement…"
                : "Editable before applying"
            }
          >
            AI STAR suggestion (Customize with your numbers)
          </Label>
          <textarea
            id="star-edit"
            rows={3}
            value={editedAiBullet}
            onChange={(e) => setEditedAiBullet(e.target.value)}
            className="field text-sm"
          />
          {aiBulletResult?.changes && (
            <p className="mt-2 border-l-2 border-accent pl-3 text-xs text-fg/65">
              <b>Rationale:</b> {aiBulletResult.changes}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => applyBullet(editedAiBullet)}
            >
              <Check size={15} /> Accept & apply bullet
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setImprove(null)}
            >
              Reject
            </Button>
          </div>
        </div>

        <div className="mb-2 font-grid text-[11px] uppercase tracking-[0.16em] text-fg/45">
          Alternative structural templates
        </div>
        <div className="space-y-2.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setEditedAiBullet(s)}
              className="block w-full border border-fg/15 p-3.5 text-left text-sm leading-relaxed transition-colors hover:border-accent hover:bg-accent/10"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs text-fg/45">
          Anti-hallucination guardrail: suggestions never invent metrics,
          employers or credentials. Replace [bracketed] placeholders with your
          real numbers.
        </p>
      </Modal>

      {/* Paste & Fix Messy Resume Text Modal */}
      <Modal
        open={messyOpen}
        onClose={() => setMessyOpen(false)}
        title="AI messy resume layout fixer"
      >
        <p className="mb-4 text-sm text-fg/65">
          Paste unformatted or broken resume text below. The AI will classify
          sections, standardize dates, categorize skills, and format STAR
          bullets into your builder draft.
        </p>
        <textarea
          rows={10}
          value={messyText}
          onChange={(e) => setMessyText(e.target.value)}
          placeholder="Paste raw or messy resume text here…"
          className="field font-mono text-xs"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setMessyOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!messyText.trim() || autoFormatting}
            onClick={() => handleAutoFormat(messyText)}
          >
            {autoFormatting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <WandSparkles size={16} />
            )}{" "}
            Parse & auto-format
          </Button>
        </div>
      </Modal>

      {/* GitHub Repo Importer Modal */}
      <Modal
        open={repoOpen}
        onClose={() => setRepoOpen(false)}
        title="Import from GitHub"
      >
        <form onSubmit={fetchRepo} className="flex gap-2">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="field"
            placeholder="https://github.com/owner/repo"
            aria-label="Repository URL"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!repoUrl || repoBusy}
          >
            {repoBusy ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              "Analyze"
            )}
          </Button>
        </form>
        {repoErr && <p className="mt-3 text-sm text-accent">{repoErr}</p>}
        {repo && (
          <div className="mt-5 border border-fg/12 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-grid text-lg font-semibold">
                  {repo.name}
                </div>
                <div className="text-sm text-fg/55">{repo.description}</div>
              </div>
              <span className="inline-flex items-center gap-1 font-grid text-sm text-fg/60">
                <Star size={14} /> {repo.stars}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[repo.language, ...repo.topics].filter(Boolean).map((t) => (
                <span
                  key={t}
                  className="border border-fg/15 px-2 py-0.5 font-grid text-xs"
                >
                  {t}
                </span>
              ))}
            </div>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-fg/80">
              {repo.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {!repo.live && (
              <p className="mt-3 text-xs text-fg/45">
                GitHub API unavailable — drafted from the repository name.
                Review before importing.
              </p>
            )}
            <Button variant="primary" className="mt-4" onClick={importRepo}>
              <Plus size={16} /> Add to projects
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}

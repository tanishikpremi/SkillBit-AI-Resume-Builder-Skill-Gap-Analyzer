import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Download, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { Bar, Button, Label, Panel, PageHeader, cx } from "../components/ui"
import { download } from "../lib/actions"
import { useApp, type UserData } from "../lib/store"
import { CATEGORIES, aliasCount, type Category } from "../lib/taxonomy"

type Tier = "Interview Ready" | "Near Match" | "Core Upskilling"
interface Student {
  id: string
  name: string
  program: string
  role: string
  fit: number
  missing: string[]
  analyses: number
  live?: boolean
}

const tierOf = (n: number): Tier =>
  n >= 75 ? "Interview Ready" : n >= 55 ? "Near Match" : "Core Upskilling"
const TIER_TONE: Record<Tier, string> = {
  "Interview Ready": "bg-fg",
  "Near Match": "bg-fg/50",
  "Core Upskilling": "bg-accent",
}

/** Deterministic mock cohort so analytics are stable between reloads. */
function mockCohort(): Student[] {
  let seed = 42
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const first = [
    "Aarav",
    "Priya",
    "Lucas",
    "Sofia",
    "Kenji",
    "Amara",
    "Diego",
    "Noor",
    "Elena",
    "Malik",
    "Yuna",
    "Omar",
    "Hana",
    "Ravi",
    "Chloe",
    "Tariq",
    "Mei",
    "Jonah",
    "Isla",
    "Kofi",
    "Zara",
    "Mateo",
    "Leah",
    "Arjun",
  ]
  const last = [
    "Patel",
    "Nguyen",
    "Silva",
    "Kim",
    "Okafor",
    "Garcia",
    "Haddad",
    "Rossi",
    "Tanaka",
    "Mensah",
    "Khan",
    "Becker",
  ]
  const programs = ["B.Tech CSE", "B.Tech IT", "M.Sc Data Science", "MCA"]
  const roles = [
    "Backend Engineer",
    "Full-Stack Engineer",
    "Data Analyst",
    "ML Engineer",
    "DevOps Engineer",
    "Frontend Engineer",
  ]
  const pool: Record<string, string[]> = {
    "Backend Engineer": [
      "Kubernetes",
      "Apache Kafka",
      "System Design",
      "PostgreSQL",
      "Go",
      "Redis",
    ],
    "Full-Stack Engineer": [
      "TypeScript",
      "Docker",
      "System Design",
      "GraphQL",
      "CI/CD",
      "AWS",
    ],
    "Data Analyst": [
      "SQL",
      "Tableau",
      "Statistics",
      "Apache Spark",
      "Power BI",
    ],
    "ML Engineer": [
      "PyTorch",
      "MLOps",
      "Docker",
      "Kubernetes",
      "LLMs",
      "Apache Spark",
    ],
    "DevOps Engineer": [
      "Terraform",
      "Kubernetes",
      "AWS",
      "Prometheus",
      "CI/CD",
    ],
    "Frontend Engineer": [
      "TypeScript",
      "Next.js",
      "Unit Testing",
      "Accessibility",
      "GraphQL",
    ],
  }
  return Array.from({ length: 42 }, (_, i) => {
    const role = roles[Math.floor(rnd() * roles.length)]
    const fit = Math.round(32 + rnd() * 62)
    const n = fit >= 75 ? 1 : fit >= 55 ? 2 : 4
    const missing = [...pool[role]].sort(() => rnd() - 0.5).slice(0, n)
    return {
      id: `m${i}`,
      name: `${first[i % first.length]} ${last[Math.floor(rnd() * last.length)]}`,
      program: programs[Math.floor(rnd() * programs.length)],
      role,
      fit,
      missing,
      analyses: 1 + Math.floor(rnd() * 6),
    }
  })
}

function liveStudents(
  users: ReturnType<ReturnType<typeof useApp>["registeredUsers"]>,
  backendLive?: Student[],
): Student[] {
  const map = new Map<string, Student>()
  for (const b of backendLive ?? []) {
    map.set(b.id, { ...b, live: true })
  }
  for (const u of users.filter((x) => x.role === "user")) {
    if (map.has(u.id)) continue
    try {
      const d = JSON.parse(
        localStorage.getItem(`skillbit:data:${u.id}`) ?? "null",
      ) as UserData | null
      const a = d?.analyses[0]
      if (!a) continue
      map.set(u.id, {
        id: u.id,
        name: u.name,
        program: "Registered",
        role: a.jobTitle,
        fit: a.result.overall,
        missing: a.result.gaps
          .filter((g) => g.status === "MISSING")
          .map((g) => g.skill),
        analyses: d!.analyses.length,
        live: true,
      })
    } catch {
      // ignore
    }
  }
  return [...map.values()]
}

function Cohort() {
  const { registeredUsers, adminMetrics } = useApp()
  const students = useMemo(
    () => [
      ...liveStudents(registeredUsers(), adminMetrics?.live_candidates),
      ...mockCohort(),
    ],
    [registeredUsers, adminMetrics?.live_candidates],
  )
  const [tier, setTier] = useState<"All" | Tier>("All")
  const [program, setProgram] = useState("All")
  const [q, setQ] = useState("")

  const filtered = students.filter(
    (s) =>
      (tier === "All" || tierOf(s.fit) === tier) &&
      (program === "All" || s.program === program) &&
      (!q || `${s.name} ${s.role}`.toLowerCase().includes(q.toLowerCase())),
  )
  const avg = filtered.length
    ? Math.round(filtered.reduce((a, s) => a + s.fit, 0) / filtered.length)
    : 0
  const tiers = (
    ["Interview Ready", "Near Match", "Core Upskilling"] as Tier[]
  ).map((t) => ({
    t,
    n: filtered.filter((s) => tierOf(s.fit) === t).length,
  }))
  const gapCounts = useMemo(() => {
    const m = new Map<string, number>()
    filtered.forEach((s) =>
      s.missing.forEach((g) => m.set(g, (m.get(g) ?? 0) + 1)),
    )
    // Also fold in backend top_cohort_skill_gaps if present
    for (const bg of adminMetrics?.placement_insights?.top_cohort_skill_gaps ??
      []) {
      m.set(bg.skill_name, (m.get(bg.skill_name) ?? 0) + bg.frequency)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [filtered, adminMetrics?.placement_insights?.top_cohort_skill_gaps])
  const roles = useMemo(() => {
    const m = new Map<string, number[]>()
    filtered.forEach((s) => m.set(s.role, [...(m.get(s.role) ?? []), s.fit]))
    return [...m.entries()]
      .map(([r, l]) => ({
        r,
        n: l.length,
        avg: Math.round(l.reduce((a, b) => a + b, 0) / l.length),
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [filtered])
  const programs = ["All", ...new Set(students.map((s) => s.program))]

  const exportCsv = () =>
    download(
      "cohort.csv",
      [
        "name,program,target_role,fit,tier,missing_skills",
        ...filtered.map((s) =>
          [
            s.name,
            s.program,
            s.role,
            s.fit,
            tierOf(s.fit),
            s.missing.join("; "),
          ]
            .map((v) => `"${v}"`)
            .join(","),
        ),
      ].join("\n"),
      "text/csv",
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg/40"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field pl-9"
            placeholder="Search students or roles"
            aria-label="Search students"
          />
        </div>
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="field md:w-48"
          aria-label="Program"
        >
          {programs.map((p) => (
            <option key={p} className="bg-surface">
              {p}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as "All" | Tier)}
          className="field md:w-52"
          aria-label="Readiness tier"
        >
          {["All", "Interview Ready", "Near Match", "Core Upskilling"].map(
            (t) => (
              <option key={t} className="bg-surface">
                {t}
              </option>
            ),
          )}
        </select>
        <Button variant="ghost" onClick={exportCsv}>
          <Download size={16} /> CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Students", filtered.length],
          ["Average fit", `${avg}%`],
          [
            "Interview ready",
            `${
              filtered.length
                ? Math.round((tiers[0].n / filtered.length) * 100)
                : 0
            }%`,
          ],
          [
            "Analyses run",
            filtered.reduce((a, s) => a + s.analyses, 0) +
              (adminMetrics?.cohort_overview?.total_evaluations_run ?? 0),
          ],
        ].map(([l, v]) => (
          <div key={l} className="border border-fg/12 bg-surface/60 p-5">
            <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
              {l}
            </div>
            <div className="mt-3 font-grid text-4xl font-semibold leading-none">
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel
          corners
          title="Most common missing skills"
          eyebrow="Curriculum signal"
        >
          <div className="space-y-3 p-5">
            {gapCounts.length === 0 && (
              <p className="text-sm text-fg/55">No gaps in this selection.</p>
            )}
            {gapCounts.map(([skill, n]) => (
              <div
                key={skill}
                className="grid grid-cols-[130px_1fr_44px] items-center gap-3 text-sm"
              >
                <span className="truncate font-grid">{skill}</span>
                <Bar value={(n / gapCounts[0][1]) * 100} className="h-3" />
                <span className="text-right font-grid text-fg/55">
                  {Math.min(100, Math.round((n / Math.max(filtered.length, 1)) * 100))}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Readiness distribution">
            <div className="p-5">
              <div className="flex h-4 w-full overflow-hidden">
                {tiers.map(({ t, n }) => (
                  <span
                    key={t}
                    className={TIER_TONE[t]}
                    style={{
                      width: `${
                        filtered.length ? (n / filtered.length) * 100 : 0
                      }%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {tiers.map(({ t, n }) => (
                  <div
                    key={t}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className={cx("size-2.5", TIER_TONE[t])} /> {t}
                    </span>
                    <span className="font-grid text-fg/70">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Fit by target role">
            <ul className="divide-y divide-fg/10">
              {roles.map((r) => (
                <li
                  key={r.r}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm"
                >
                  <span className="flex-1 truncate">{r.r}</span>
                  <span className="text-xs text-fg/40">{r.n}</span>
                  <span className="w-10 text-right font-grid">{r.avg}%</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="Students" eyebrow={`${filtered.length} shown`}>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="font-grid text-[11px] uppercase tracking-[0.16em] text-fg/45">
              <tr className="border-b border-fg/10">
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-3 py-3 font-medium">Program</th>
                <th className="px-3 py-3 font-medium">Target role</th>
                <th className="px-3 py-3 font-medium">Fit</th>
                <th className="px-5 py-3 font-medium">Top gaps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/[0.07]">
              {[...filtered]
                .sort((a, b) => a.fit - b.fit)
                .map((s) => (
                  <tr key={s.id} className="hover:bg-fg/[0.03]">
                    <td className="px-5 py-3">
                      <span className="font-medium">{s.name}</span>
                      {s.live && (
                        <span className="ml-2 border border-fg/50 px-1.5 font-grid text-[10px] text-fg">
                          LIVE
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-fg/60">{s.program}</td>
                    <td className="px-3 py-3 text-fg/80">{s.role}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 font-grid">
                        <span
                          className={cx("size-2", TIER_TONE[tierOf(s.fit)])}
                        />
                        {s.fit}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-fg/60">
                      {s.missing.slice(0, 3).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function Taxonomy() {
  const { taxonomy, customSkills, backendSkills, addSkill, removeSkill } =
    useApp()
  const [q, setQ] = useState("")
  const [cat, setCat] = useState<"All" | Category>("All")
  const [f, setF] = useState({
    name: "",
    category: CATEGORIES[0] as Category,
    aliases: "",
    description: "",
  })
  const [err, setErr] = useState("")
  const [okMsg, setOkMsg] = useState("")
  const customNames = new Set(customSkills.map((c) => c.name))
  const backendNames = new Set(backendSkills.map((b) => b.canonical_name))

  const list = taxonomy.filter(
    (s) =>
      (cat === "All" || s.category === cat) &&
      (!q ||
        [s.name, ...s.aliases].some((x) =>
          x.toLowerCase().includes(q.toLowerCase()),
        )),
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = f.name.trim()
    if (!name) return setErr("Skill name is required.")
    if (
      taxonomy.some(
        (s) =>
          s.name.toLowerCase() === name.toLowerCase() &&
          !customNames.has(s.name),
      )
    )
      return setErr("That skill already exists in the base taxonomy.")
    await addSkill(
      name,
      f.category,
      f.aliases
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
      f.description.trim() || undefined,
    )
    setF({ ...f, name: "", aliases: "", description: "" })
    setErr("")
    setOkMsg(`Registered "${name}" in canonical taxonomy.`)
    setTimeout(() => setOkMsg(""), 3000)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Panel
        title="Canonical skills"
        eyebrow={`${taxonomy.length} skills · ${aliasCount(taxonomy)} aliases`}
      >
        <div className="flex flex-col gap-3 border-b border-fg/10 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg/40"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="field pl-9"
              placeholder="Search name or alias"
              aria-label="Search taxonomy"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as "All" | Category)}
            className="field sm:w-60"
            aria-label="Category"
          >
            {["All", ...CATEGORIES].map((c) => (
              <option key={c} className="bg-surface">
                {c}
              </option>
            ))}
          </select>
        </div>
        <ul className="max-h-[640px] divide-y divide-fg/[0.07] overflow-y-auto scroll-thin">
          {list.map((s) => (
            <li key={s.name} className="flex items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-grid font-medium">{s.name}</span>
                  {customNames.has(s.name) && (
                    <span className="border border-fg/30 px-1.5 font-grid text-[10px] text-fg/80">
                      CUSTOM
                    </span>
                  )}
                  <span className="text-xs text-fg/40">{s.category}</span>
                </div>
                {s.aliases.length > 0 && (
                  <div className="mt-1 text-xs text-fg/50">
                    {s.aliases.join(" · ")}
                  </div>
                )}
              </div>
              {(customNames.has(s.name) || backendNames.has(s.name)) && (
                <button
                  onClick={() => removeSkill(s.name)}
                  className="p-1.5 text-fg/40 hover:text-accent"
                  aria-label={`Remove ${s.name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
          {list.length === 0 && (
            <li className="px-5 py-6 text-sm text-fg/55">No skills match.</li>
          )}
        </ul>
      </Panel>

      <Panel corners title="Add skill" eyebrow="Applies to new parses">
        <form onSubmit={submit} className="space-y-4 p-5">
          <div>
            <Label htmlFor="t-name">Canonical name</Label>
            <input
              id="t-name"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              className="field"
              placeholder="e.g. Zig"
            />
          </div>
          <div>
            <Label htmlFor="t-cat">Category</Label>
            <select
              id="t-cat"
              value={f.category}
              onChange={(e) =>
                setF({ ...f, category: e.target.value as Category })
              }
              className="field"
            >
              {CATEGORIES.map((c) => (
                <option key={c} className="bg-surface">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="t-alias" hint="Comma separated">
              Aliases
            </Label>
            <input
              id="t-alias"
              value={f.aliases}
              onChange={(e) => setF({ ...f, aliases: e.target.value })}
              className="field"
              placeholder="ziglang, zig programming"
            />
          </div>
          <div>
            <Label htmlFor="t-desc" hint="Optional">
              Description
            </Label>
            <input
              id="t-desc"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="field"
              placeholder="Systems programming language"
            />
          </div>
          {err && <p className="text-sm text-accent">{err}</p>}
          {okMsg && <p className="text-sm text-fg/80">{okMsg}</p>}
          <Button type="submit" variant="primary" className="w-full">
            <Plus size={16} /> Add to taxonomy
          </Button>
        </form>
      </Panel>
    </div>
  )
}

function Users() {
  const { registeredUsers } = useApp()
  const users = registeredUsers()
  return (
    <Panel
      title="Registered accounts"
      eyebrow={`${users.length} accounts`}
    >
      <ul className="divide-y divide-fg/10">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center gap-4 px-5 py-3.5"
          >
            <span className="grid size-9 place-items-center bg-accent font-grid text-canvas text-sm font-semibold">
              {u.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-fg/50">{u.email}</div>
            </div>
            <span className="border border-fg/15 px-2 py-0.5 font-grid text-[11px] uppercase tracking-[0.12em] text-fg/60">
              {u.provider}
            </span>
            <span
              className={cx(
                "border px-2 py-0.5 font-grid text-[11px] uppercase tracking-[0.12em]",
                u.role === "admin"
                  ? "border-accent/50 text-accent"
                  : "border-fg/15 text-fg/60",
              )}
            >
              {u.role}
            </span>
            <span className="w-24 text-right text-xs text-fg/40">
              {new Date(u.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

const TABS = ["Cohort analytics", "Skill taxonomy", "Users"] as const

export default function Admin() {
  const { refreshAdminMetrics } = useApp()
  const [tab, setTab] = useState<typeof TABS[number]>("Cohort analytics")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    refreshAdminMetrics()
  }, [refreshAdminMetrics])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshAdminMetrics()
    setRefreshing(false)
  }

  return (
    <>
      <PageHeader
        eyebrow="Placement portal"
        title="Cohort intelligence"
        desc="Aggregate readiness and skill gaps across students to target workshops and curriculum. Registered users with analyses appear as LIVE alongside the demo cohort."
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin text-accent" : ""}
            />{" "}
            Refresh telemetry
          </Button>
        }
      />
      <div className="mb-6 flex gap-px overflow-x-auto bg-fg/10" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx(
              "whitespace-nowrap px-5 py-3 font-grid text-sm transition-colors",
              tab === t
                ? "bg-accent text-canvas"
                : "bg-surface text-fg/60 hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Cohort analytics" && <Cohort />}
      {tab === "Skill taxonomy" && <Taxonomy />}
      {tab === "Users" && <Users />}
    </>
  )
}

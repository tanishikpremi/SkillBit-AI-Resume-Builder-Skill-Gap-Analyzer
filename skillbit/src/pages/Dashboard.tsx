import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileUp,
  Hammer,
  RefreshCw,
  Route,
  Target,
} from "lucide-react"
import {
  Bar,
  Button,
  ButtonLink,
  Empty,
  Panel,
  PageHeader,
  PriorityTag,
  ScoreGauge,
  StatusBadge,
  cx,
  timeAgo,
} from "../components/ui"
import { roadmapProgress } from "../lib/actions"
import { api, getToken } from "../lib/api"
import { useUserData } from "../lib/store"

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="relative border border-fg/12 bg-surface/60 p-5">
      <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
        {label}
      </div>
      <div
        className={cx(
          "mt-3 font-grid text-4xl font-semibold leading-none",
          accent && "text-accent",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-2 text-xs text-fg/50">{sub}</div>}
      <span className="absolute right-3 top-3 size-1.5 bg-accent" />
    </div>
  )
}

export default function Dashboard() {
  const { data, user, refreshFromBackend } = useUserData()
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState("")

  const latest = data.analyses[0]
  const resume = data.resumes[0]
  const dash = data.dashboard

  const avgRoadmap = data.roadmaps.length
    ? Math.round(
        data.roadmaps.reduce(
          (a, r) => a + roadmapProgress(data.progress, r.skill),
          0,
        ) / data.roadmaps.length,
      )
    : 0
  const first = user.name.split(" ")[0]

  const categoryDist = useMemo(() => {
    if (
      dash?.skill_category_distribution &&
      Object.keys(dash.skill_category_distribution).length > 0
    ) {
      return Object.entries(dash.skill_category_distribution).sort(
        (a, b) => b[1] - a[1],
      )
    }
    const m = new Map<string, number>()
    for (const s of resume?.parsed.skills ?? []) {
      m.set(s.category, (m.get(s.category) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [dash?.skill_category_distribution, resume?.parsed.skills])

  const topStrengths = useMemo(() => {
    if (dash?.top_strengths && dash.top_strengths.length > 0) {
      return dash.top_strengths
    }
    return (resume?.parsed.skills ?? [])
      .filter((s) => s.evidence === "STRONG" || s.evidence === "MODERATE")
      .slice(0, 8)
      .map((s) => s.name)
  }, [dash?.top_strengths, resume?.parsed.skills])

  const completeness = useMemo(() => {
    if (dash?.resume_completeness_pct !== undefined) {
      return dash.resume_completeness_pct
    }
    let c = 0
    if (data.profile.headline) c += 15
    if (data.profile.summary) c += 20
    if (data.profile.location) c += 10
    if (data.profile.linkedin || data.profile.github) c += 15
    if (resume) c += 40
    return Math.min(100, c)
  }, [dash?.resume_completeness_pct, data.profile, resume])

  const qualityScore = useMemo(() => {
    if (dash?.overall_quality_score !== undefined) {
      return dash.overall_quality_score
    }
    const ats = resume?.parsed.atsScore ?? 75
    const quant = Math.round((resume?.parsed.quantifiedRatio ?? 0.4) * 100)
    return Math.round(completeness * 0.4 + quant * 0.3 + ats * 0.3)
  }, [dash?.overall_quality_score, completeness, resume])

  const handleSyncProfile = async () => {
    setSyncing(true)
    setSyncNote("")
    try {
      if (getToken()) {
        await api.syncProfileFromResume()
        await refreshFromBackend()
      }
      setSyncNote("Master Profile synced from your latest resume.")
      setTimeout(() => setSyncNote(""), 3500)
    } catch (err) {
      setSyncNote(
        (err as Error).message || "Upload a resume first to sync profile.",
      )
      setTimeout(() => setSyncNote(""), 3500)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={
          <>
            Hello, {first}.{" "}
            <span className="text-fg/45">Here’s where you stand.</span>
          </>
        }
        actions={
          <>
            {resume && (
              <Button
                variant="ghost"
                disabled={syncing}
                onClick={handleSyncProfile}
              >
                <RefreshCw
                  size={16}
                  className={syncing ? "animate-spin text-accent" : ""}
                />{" "}
                {syncing ? "Syncing…" : "Sync Master Profile"}
              </Button>
            )}
            <ButtonLink to="/app/upload" variant="ghost">
              <FileUp size={17} /> Upload resume
            </ButtonLink>
            <ButtonLink to="/app/match" variant="primary">
              <Target size={17} /> New job match
            </ButtonLink>
          </>
        }
      />

      {syncNote && (
        <div className="mb-5 flex items-center gap-2 border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm">
          <Check size={16} className="text-accent" />
          <span>{syncNote}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Latest fit score"
          value={latest ? `${latest.result.overall}%` : "—"}
          sub={latest ? latest.result.insights.tier : "Run your first match"}
          accent
        />
        <Kpi
          label="ATS readiness"
          value={resume ? `${resume.parsed.atsScore}` : "—"}
          sub={
            resume
              ? `${Math.round(resume.parsed.quantifiedRatio * 100)}% quantified bullets`
              : "Upload a resume"
          }
        />
        <Kpi
          label="Analyses run"
          value={data.analyses.length}
          sub={`${data.resumes.length} resume${
            data.resumes.length === 1 ? "" : "s"
          } on file`}
        />
        <Kpi
          label="Roadmap progress"
          value={`${avgRoadmap}%`}
          sub={`${data.roadmaps.length} active roadmap${
            data.roadmaps.length === 1 ? "" : "s"
          }`}
        />
      </div>

      {!latest ? (
        <Panel className="mt-6" corners>
          <Empty
            icon={<Target size={26} />}
            title="No job match yet"
            body={
              resume
                ? "Paste a job description to see your explainable fit score and skill gaps."
                : "Start by uploading or pasting your resume — we’ll trace every skill to its evidence."
            }
            action={
              <ButtonLink
                to={resume ? "/app/match" : "/app/upload"}
                variant="primary"
              >
                {resume ? "Match a job" : "Upload resume"}{" "}
                <ArrowRight size={17} />
              </ButtonLink>
            }
          />
        </Panel>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <Panel
            corners
            eyebrow="Latest analysis"
            title={
              <>
                {latest.jobTitle}{" "}
                <span className="text-fg/45">· {latest.company}</span>
              </>
            }
            action={
              <Link
                to={`/app/match/${latest.id}`}
                className="inline-flex items-center gap-1 font-grid text-sm text-fg/60 hover:text-accent"
              >
                Full report <ArrowUpRight size={15} />
              </Link>
            }
          >
            <div className="flex flex-col gap-8 p-6 md:flex-row md:items-center">
              <ScoreGauge value={latest.result.overall} size={190} />
              <div className="flex-1 space-y-4">
                {([
                  ["Exact match", latest.result.exact, "bg-fg"],
                  [
                    "Experience evidence",
                    latest.result.experience,
                    "bg-accent",
                  ],
                  ["Semantic resonance", latest.result.semantic, "bg-fg/35"],
                ] as const).map(([l, v, t]) => (
                  <div key={l}>
                    <div className="mb-1.5 flex justify-between font-grid text-[12px] uppercase tracking-[0.14em] text-fg/60">
                      <span>{l}</span>
                      <span className="text-fg">{v}%</span>
                    </div>
                    <Bar value={v} tone={t} />
                  </div>
                ))}
                <p className="border-l-2 border-accent pl-3 text-sm leading-relaxed text-fg/70">
                  {latest.result.insights.summary}
                </p>
              </div>
            </div>
          </Panel>

          <Panel
            eyebrow="Priority gaps"
            title="Close these first"
            action={
              <span className="font-grid text-xs text-fg/40">
                {timeAgo(latest.createdAt)}
              </span>
            }
          >
            <ul className="divide-y divide-fg/10">
              {latest.result.gaps
                .filter((g) => g.status !== "STRONG_MATCH")
                .slice(0, 5)
                .map((g) => (
                  <li
                    key={g.skill}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-grid font-medium">
                          {g.skill}
                        </span>
                        <PriorityTag p={g.priority} />
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={g.status} />
                      </div>
                    </div>
                    <Link
                      to={`/app/roadmaps?skill=${encodeURIComponent(g.skill)}`}
                      className="shrink-0 border border-fg/15 p-2 text-fg/60 hover:border-accent hover:text-accent"
                      aria-label={`Roadmap for ${g.skill}`}
                    >
                      <Route size={16} />
                    </Link>
                  </li>
                ))}
              {latest.result.gaps.every((g) => g.status === "STRONG_MATCH") && (
                <li className="px-5 py-6 text-sm text-fg/60">
                  No gaps — every requirement has strong evidence.
                </li>
              )}
            </ul>
          </Panel>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          eyebrow="Next actions"
          title="This week"
          className="lg:col-span-2"
        >
          <ol className="divide-y divide-fg/10">
            {(
              latest?.result.insights.actions ?? [
                "Upload your resume to get a parsed evidence report.",
                "Paste a target job description to compute fit.",
                "Generate a roadmap for your top missing skill.",
              ]
            ).map((a, i) => (
              <li key={a} className="flex gap-4 px-5 py-4">
                <span className="font-grid text-2xl font-semibold leading-none text-accent">
                  0{i + 1}
                </span>
                <span className="text-[15px] leading-relaxed text-fg/80">
                  {a}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel
          eyebrow="Roadmaps"
          title="In progress"
          action={
            <Link
              to="/app/roadmaps"
              className="font-grid text-sm text-fg/60 hover:text-accent"
            >
              All
            </Link>
          }
        >
          <div className="space-y-4 p-5">
            {data.roadmaps.length === 0 && (
              <p className="text-sm text-fg/55">
                Generate a roadmap from any gap to track learning here.
              </p>
            )}
            {data.roadmaps.slice(0, 4).map((r) => {
              const p = roadmapProgress(data.progress, r.skill)
              return (
                <Link
                  key={r.skill}
                  to={`/app/roadmaps?skill=${encodeURIComponent(r.skill)}`}
                  className="block group"
                >
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-grid font-medium group-hover:text-accent">
                      {r.skill}
                    </span>
                    <span className="font-grid text-fg/50">{p}%</span>
                  </div>
                  <Bar value={p} tone={p === 100 ? "bg-fg" : "bg-accent"} />
                </Link>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Career Quality Breakdown & Skill Domain Distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          eyebrow="Quality composite"
          title="Profile & resume readiness"
          action={
            <Link
              to="/app/profile"
              className="font-grid text-sm text-fg/60 hover:text-accent"
            >
              Edit profile
            </Link>
          }
        >
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-fg/10 bg-fg/[0.02] p-3.5">
                <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/50">
                  Profile completeness
                </div>
                <div className="mt-1 font-grid text-2xl font-semibold">
                  {completeness}%
                </div>
                <Bar value={completeness} className="mt-2" />
              </div>
              <div className="border border-fg/10 bg-fg/[0.02] p-3.5">
                <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/50">
                  Overall quality score
                </div>
                <div className="mt-1 font-grid text-2xl font-semibold">
                  {qualityScore}%
                </div>
                <Bar value={qualityScore} tone="bg-fg" className="mt-2" />
              </div>
            </div>
            {(
              dash?.quality_indicators ?? [
                {
                  label: "Quantified Achievements",
                  status:
                    (resume?.parsed.quantifiedRatio ?? 0) >= 0.6
                      ? "EXCELLENT"
                      : "GOOD",
                  score: Math.round((resume?.parsed.quantifiedRatio ?? 0) * 100),
                  message: resume
                    ? `${Math.round(resume.parsed.quantifiedRatio * 100)}% of ${resume.parsed.bulletCount} bullets feature measurable metrics.`
                    : "Upload a resume to inspect quantified accomplishment bullets.",
                },
                {
                  label: "ATS Structure & Headings",
                  status:
                    (resume?.parsed.atsScore ?? 75) >= 80
                      ? "EXCELLENT"
                      : "GOOD",
                  score: resume?.parsed.atsScore ?? 75,
                  message:
                    "Single-column, clean semantic layout optimized for ATS parsers.",
                },
              ]
            ).map((ind) => (
              <div
                key={ind.label}
                className="flex items-start justify-between gap-3 border border-fg/10 p-3.5"
              >
                <div>
                  <div className="font-grid text-sm font-medium">
                    {ind.label}
                  </div>
                  <p className="mt-1 text-xs text-fg/60">{ind.message}</p>
                </div>
                <span
                  className={cx(
                    "shrink-0 border px-2 py-0.5 font-grid text-[10px] uppercase tracking-[0.14em]",
                    ind.status === "EXCELLENT"
                      ? "border-fg/50 text-fg"
                      : ind.status === "GOOD"
                        ? "border-fg/30 text-fg/75"
                        : "border-accent/50 text-accent",
                  )}
                >
                  {ind.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Portfolio"
          title="Skill domain distribution"
          action={
            <span className="font-grid text-xs text-fg/45">
              {topStrengths.length} verified strengths
            </span>
          }
        >
          <div className="space-y-4 p-5">
            {categoryDist.length === 0 ? (
              <p className="text-sm text-fg/55">
                Upload a resume to visualize your skill distribution across
                technical domains.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryDist.slice(0, 5).map(([cat, count]) => {
                  const max = Math.max(
                    ...categoryDist.map(([, c]) => c),
                    1,
                  )
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex justify-between font-grid text-xs">
                        <span className="text-fg/80">{cat}</span>
                        <span className="text-fg/50">{count}</span>
                      </div>
                      <Bar value={(count / max) * 100} />
                    </div>
                  )
                })}
              </div>
            )}
            {topStrengths.length > 0 && (
              <div className="border-t border-fg/10 pt-3">
                <div className="mb-2 font-grid text-[10px] uppercase tracking-[0.18em] text-fg/45">
                  Top evidenced skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topStrengths.map((sk) => (
                    <span
                      key={sk}
                      className="border border-fg/20 px-2 py-0.5 font-grid text-xs text-fg/85"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          {
            to: "/app/upload",
            icon: FileUp,
            t: "Parse a resume",
            d: "Trace each skill to evidence.",
          },
          {
            to: "/app/builder",
            icon: Hammer,
            t: "Open the builder",
            d: "Rewrite bullets, export ATS PDF.",
          },
          {
            to: "/app/match",
            icon: Target,
            t: "Match another job",
            d: "Compare fit across roles.",
          },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group flex items-center gap-4 border border-fg/12 bg-fg/[0.02] p-5 transition-colors hover:border-accent/60 hover:bg-accent/[0.06]"
          >
            <q.icon size={22} className="text-accent" strokeWidth={1.6} />
            <div className="flex-1">
              <div className="font-grid font-semibold">{q.t}</div>
              <div className="text-sm text-fg/55">{q.d}</div>
            </div>
            <ArrowRight
              size={18}
              className="text-fg/40 transition-transform group-hover:translate-x-1 group-hover:text-fg"
            />
          </Link>
        ))}
      </div>
    </>
  )
}

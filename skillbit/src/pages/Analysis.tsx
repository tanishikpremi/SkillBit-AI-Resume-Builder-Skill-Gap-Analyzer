import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  Hammer,
  RefreshCw,
  Route,
  Trash2,
} from "lucide-react"
import {
  Bar,
  Button,
  ButtonLink,
  Empty,
  EvidenceBadge,
  Panel,
  PageHeader,
  PriorityTag,
  STATUS_META,
  ScoreGauge,
  StatusBadge,
  cx,
  timeAgo,
} from "../components/ui"
import { api, getToken } from "../lib/api"
import type { GapStatus } from "../lib/engine"
import { mapBackendAnalysisToDoc, useUserData } from "../lib/store"

const FILTERS: ("ALL" | GapStatus)[] = [
  "ALL",
  "MISSING",
  "PARTIAL_MATCH",
  "WEAK_EVIDENCE",
  "STRONG_MATCH",
]

export default function Analysis() {
  const { id } = useParams()
  const { data, update } = useUserData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<typeof FILTERS[number]>("ALL")
  const [refreshingInsights, setRefreshingInsights] = useState(false)
  const a = data.analyses.find((x) => x.id === id)

  useEffect(() => {
    if (!id || a || !getToken()) return
    api
      .getAnalysisById(id)
      .then((res) => {
        const doc = mapBackendAnalysisToDoc(res, data.resumes, data.jobs ?? [])
        update((d) => ({
          ...d,
          analyses: [doc, ...d.analyses.filter((x) => x.id !== doc.id)],
        }))
      })
      .catch(() => {
        // ignore if local-only
      })
  }, [id, a, data.resumes, data.jobs, update])

  if (!a) {
    return (
      <Panel corners>
        <Empty
          icon={<Route size={24} />}
          title="Analysis not found"
          body="It may have been deleted from your history."
          action={
            <ButtonLink to="/app/match" variant="primary">
              Run a new match
            </ButtonLink>
          }
        />
      </Panel>
    )
  }

  const { result } = a
  const counts = FILTERS.reduce<Record<string, number>>(
    (acc, f) => ({
      ...acc,
      [f]:
        f === "ALL"
          ? result.gaps.length
          : result.gaps.filter((g) => g.status === f).length,
    }),
    {},
  )
  const gaps =
    filter === "ALL"
      ? result.gaps
      : result.gaps.filter((g) => g.status === filter)

  const startRoadmap = (skill: string) => {
    update((d) =>
      d.roadmaps.some((r) => r.skill === skill)
        ? d
        : {
            ...d,
            roadmaps: [
              { skill, role: a.jobTitle, createdAt: Date.now() },
              ...d.roadmaps,
            ],
          },
    )
    navigate(
      `/app/roadmaps?skill=${encodeURIComponent(skill)}&analysisId=${encodeURIComponent(a.id)}`,
    )
  }

  const handleRefreshInsights = async () => {
    setRefreshingInsights(true)
    try {
      if (getToken()) {
        const ai = await api.refreshAiInsights(a.id)
        update((d) => ({
          ...d,
          analyses: d.analyses.map((item) =>
            item.id === a.id
              ? {
                  ...item,
                  result: {
                    ...item.result,
                    insights: {
                      tier:
                        ai.readiness_level || item.result.insights.tier,
                      summary:
                        ai.executive_summary || item.result.insights.summary,
                      priorities:
                        ai.top_improvement_priorities ||
                        item.result.insights.priorities,
                      actions:
                        ai.strategic_action_plan ||
                        item.result.insights.actions,
                      provider:
                        ai.provider_used || item.result.insights.provider,
                    },
                  },
                }
              : item,
          ),
        }))
      }
    } catch {
      // ignore if offline
    } finally {
      setRefreshingInsights(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this analysis?")) return
    if (getToken()) {
      try {
        await api.deleteAnalysis(a.id)
      } catch {
        // ignore
      }
    }
    update((d) => ({
      ...d,
      analyses: d.analyses.filter((x) => x.id !== a.id),
    }))
    navigate("/app/history")
  }

  const tierTone =
    result.insights.tier === "Interview Ready"
      ? "text-fg border-fg/50"
      : result.insights.tier.startsWith("Near")
        ? "text-fg/60 border-fg/25"
        : "text-accent border-accent/50"

  const matchedCount = counts.STRONG_MATCH ?? 0
  const requiredCount = result.gaps.filter(
    (g) => g.importance === "REQUIRED",
  ).length

  return (
    <>
      <Link
        to="/app/history"
        className="mb-5 inline-flex items-center gap-2 font-grid text-sm text-fg/55 hover:text-fg"
      >
        <ArrowLeft size={15} /> All analyses
      </Link>
      <PageHeader
        eyebrow={`Match report · ${timeAgo(a.createdAt)}`}
        title={
          <>
            {a.jobTitle} <span className="text-fg/45">at {a.company}</span>
          </>
        }
        desc={
          <>
            Resume: <span className="text-fg">{a.resumeTitle}</span> ·
            Seniority: {a.job.seniority} · Matched:{" "}
            <span className="text-fg">
              {matchedCount}/{result.gaps.length}
            </span>{" "}
            ({requiredCount} required)
          </>
        }
        actions={
          <>
            <ButtonLink
              to={`/app/roadmaps?analysisId=${encodeURIComponent(a.id)}`}
              variant="ghost"
            >
              <Route size={17} /> Skill roadmaps
            </ButtonLink>
            <ButtonLink to="/app/builder" variant="ghost">
              <Hammer size={17} /> Improve in builder
            </ButtonLink>
            <Button variant="quiet" onClick={handleDelete}>
              <Trash2 size={17} /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <Panel corners>
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
            <ScoreGauge value={result.overall} size={210} label="Overall fit" />
            <div className="w-full flex-1">
              <span
                className={cx(
                  "inline-block border px-2.5 py-1 font-grid text-[12px] uppercase tracking-[0.14em]",
                  tierTone,
                )}
              >
                {result.insights.tier}
              </span>
              <p className="mt-4 text-[15px] leading-relaxed text-fg/80">
                {result.insights.summary}
              </p>
              <div className="mt-5 space-y-3.5">
                {([
                  [
                    "Exact match",
                    result.exact,
                    "bg-fg",
                    "Weighted share of requirements found verbatim or via alias.",
                  ],
                  [
                    "Experience evidence",
                    result.experience,
                    "bg-accent",
                    "Average evidence tier of matched skills.",
                  ],
                  [
                    "Semantic resonance",
                    result.semantic,
                    "bg-fg/35",
                    "Hybrid word + character n-gram similarity.",
                  ],
                ] as const).map(([l, v, t, hint]) => (
                  <div key={l} title={hint}>
                    <div className="mb-1.5 flex justify-between font-grid text-[12px] uppercase tracking-[0.14em] text-fg/60">
                      <span>{l}</span>
                      <span className="text-fg">{v}%</span>
                    </div>
                    <Bar value={v} tone={t} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-fg/10 px-6 py-4 font-mono text-[12px] leading-relaxed text-fg/55">
            fit = Σ w·(0.6·exact + 0.4·max(evidence, semantic)) / Σ w
            &nbsp;·&nbsp; w = 1.0 required, 0.5 preferred &nbsp;·&nbsp; partial
            = 0.45 × related
          </div>
        </Panel>

        <Panel
          eyebrow={result.insights.provider}
          title="Recommendations"
          action={
            <button
              type="button"
              onClick={handleRefreshInsights}
              disabled={refreshingInsights}
              title="Regenerate AI career insights"
              className="inline-flex items-center gap-1.5 border border-fg/15 px-2.5 py-1 font-grid text-xs text-fg/60 hover:border-accent hover:text-accent disabled:opacity-40"
            >
              <RefreshCw
                size={13}
                className={refreshingInsights ? "animate-spin text-accent" : ""}
              />
              {refreshingInsights ? "Refreshing…" : "Refresh AI"}
            </button>
          }
        >
          <div className="grid gap-px bg-fg/10 md:grid-cols-2">
            <div className="bg-surface p-5">
              <div className="mb-3 font-grid text-[12px] uppercase tracking-[0.16em] text-accent">
                Focus areas
              </div>
              <ul className="space-y-2.5">
                {result.insights.priorities.length === 0 && (
                  <li className="text-sm text-fg/60">
                    Nothing urgent — polish and apply.
                  </li>
                )}
                {result.insights.priorities.map((p) => (
                  <li
                    key={p}
                    className="flex gap-2 text-sm leading-relaxed text-fg/80"
                  >
                    <ArrowRight
                      size={15}
                      className="mt-0.5 shrink-0 text-accent"
                    />{" "}
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface p-5">
              <div className="mb-3 font-grid text-[12px] uppercase tracking-[0.16em] text-accent">
                Action plan
              </div>
              <ol className="space-y-2.5">
                {result.insights.actions.map((p, i) => (
                  <li
                    key={p}
                    className="flex gap-2.5 text-sm leading-relaxed text-fg/80"
                  >
                    <span className="font-grid text-fg/40">0{i + 1}</span> {p}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="border-t border-fg/10 px-5 py-3 text-xs italic text-fg/45">
            {a.disclaimer ||
              "This score is an automated ATS alignment indicator and does not guarantee employment or interview selection."}
          </p>
        </Panel>
      </div>

      <div className="mt-8 mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className="font-grid text-2xl font-semibold">
          Skill-by-skill breakdown
        </h2>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cx(
                "border px-3 py-1.5 font-grid text-[12px] uppercase tracking-[0.1em] transition-colors",
                filter === f
                  ? "border-accent bg-accent/15 text-fg"
                  : "border-fg/15 text-fg/60 hover:text-fg",
              )}
            >
              {f === "ALL" ? "All" : STATUS_META[f].label}{" "}
              <span className="text-fg/40">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {gaps.map((g) => (
          <div
            key={g.skill}
            className={cx(
              "relative border bg-surface/60 p-5",
              g.status === "MISSING" ? "border-accent/35" : "border-fg/12",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-grid text-xl font-semibold">{g.skill}</h3>
                  <span className="font-grid text-[11px] uppercase tracking-[0.14em] text-fg/40">
                    {g.importance}
                  </span>
                </div>
                <div className="mt-1 text-xs text-fg/45">{g.category}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={g.status} />
                {g.status !== "STRONG_MATCH" && <PriorityTag p={g.priority} />}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="border-l-2 border-fg/20 pl-3">
                <div className="mb-1 flex items-center gap-2 font-grid text-[10px] uppercase tracking-[0.18em] text-fg/45">
                  Your resume{" "}
                  {g.evidenceTier && <EvidenceBadge tier={g.evidenceTier} />}
                </div>
                <p className="text-sm leading-relaxed text-fg/75">
                  {g.resumeEvidence
                    ? `“${g.resumeEvidence}”`
                    : g.relatedSkill
                      ? `No direct mention — related experience with ${g.relatedSkill}.`
                      : "No evidence found."}
                </p>
              </div>
              <div className="border-l-2 border-accent/50 pl-3">
                <div className="mb-1 font-grid text-[10px] uppercase tracking-[0.18em] text-fg/45">
                  Job asks
                </div>
                <p className="text-sm leading-relaxed text-fg/75">
                  “{g.jobContext}”
                </p>
              </div>
            </div>
            {g.reason && g.reason !== g.jobContext && (
              <p className="mt-3 text-xs leading-relaxed text-fg/55">
                {g.reason}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-fg/10 pt-3">
              <span className="font-grid text-xs text-fg/45">
                Contribution {Math.round(g.contribution * 100)}%
              </span>
              {g.status !== "STRONG_MATCH" && (
                <button
                  onClick={() => startRoadmap(g.skill)}
                  className="inline-flex items-center gap-1.5 font-grid text-sm text-accent hover:text-fg"
                >
                  <Route size={15} />{" "}
                  {data.roadmaps.some((r) => r.skill === g.skill)
                    ? "Open roadmap"
                    : "Generate roadmap"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

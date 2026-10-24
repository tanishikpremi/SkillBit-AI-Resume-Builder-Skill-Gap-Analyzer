import { useMemo, useState } from "react"
import { Link } from "react-router"
import { FileText, History as HistoryIcon, Search, Target } from "lucide-react"
import { ButtonLink, Empty, Panel, PageHeader, cx } from "../components/ui"
import { useUserData } from "../lib/store"

type Kind = "all" | "analysis" | "resume"

export default function History() {
  const { data } = useUserData()
  const [kind, setKind] = useState<Kind>("all")
  const [q, setQ] = useState("")

  const items = useMemo(() => {
    const list = [
      ...data.analyses.map((a) => ({
        id: a.id,
        kind: "analysis" as const,
        title: `${a.jobTitle} · ${a.company}`,
        sub: `${a.resumeTitle} · ${a.result.insights.tier}`,
        score: a.result.overall,
        at: a.createdAt,
        to: `/app/match/${a.id}`,
      })),
      ...data.resumes.map((r) => ({
        id: r.id,
        kind: "resume" as const,
        title: r.title,
        sub: `${r.source} · ${r.parsed.skills.length} skills`,
        score: r.parsed.atsScore,
        at: r.createdAt,
        to: "/app/upload",
      })),
    ]
    return list
      .filter((i) => kind === "all" || i.kind === kind)
      .filter(
        (i) =>
          !q || `${i.title} ${i.sub}`.toLowerCase().includes(q.toLowerCase()),
      )
      .sort((a, b) => b.at - a.at)
  }, [data, kind, q])

  const trend = [...data.analyses].reverse().slice(-12)

  return (
    <>
      <PageHeader
        eyebrow="History"
        title="Activity timeline"
        desc="Every resume and job analysis you’ve run, newest first."
        actions={
          <ButtonLink to="/app/match" variant="primary">
            <Target size={17} /> New match
          </ButtonLink>
        }
      />

      {trend.length > 1 && (
        <Panel
          className="mb-6"
          title="Fit score trend"
          eyebrow={`${trend.length} analyses`}
        >
          <div className="flex h-40 items-end gap-2 px-5 pb-5 pt-6">
            {trend.map((a) => (
              <Link
                key={a.id}
                to={`/app/match/${a.id}`}
                className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                title={`${a.jobTitle}: ${a.result.overall}%`}
              >
                <span className="font-grid text-xs text-fg/50 group-hover:text-fg">
                  {a.result.overall}
                </span>
                <span
                  className={cx(
                    "w-full max-w-12 transition-colors",
                    a.result.overall >= 75
                      ? "bg-fg/80"
                      : a.result.overall >= 55
                        ? "bg-fg/40"
                        : "bg-accent/70",
                    "group-hover:bg-fg",
                  )}
                  style={{ height: `${Math.max(6, a.result.overall)}%` }}
                />
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg/40"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field pl-9"
            placeholder="Search by job, company or resume"
            aria-label="Search history"
          />
        </div>
        <div className="flex gap-px bg-fg/10">
          {(["all", "analysis", "resume"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cx(
                "px-4 font-grid text-sm capitalize",
                kind === k
                  ? "bg-accent text-canvas"
                  : "bg-surface text-fg/60 hover:text-fg",
              )}
            >
              {k === "all" ? "All" : `${k}s`}
            </button>
          ))}
        </div>
      </div>

      <Panel>
        {items.length === 0 ? (
          <Empty
            icon={<HistoryIcon size={24} />}
            title="Nothing here yet"
            body="Your parsed resumes and match reports will appear on this timeline."
          />
        ) : (
          <ul className="divide-y divide-fg/10">
            {items.map((i) => (
              <li key={i.id}>
                <Link
                  to={i.to}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fg/[0.04]"
                >
                  <span
                    className={cx(
                      "grid size-10 shrink-0 place-items-center border",
                      i.kind === "analysis"
                        ? "border-accent/50 text-accent"
                        : "border-fg/20 text-fg/60",
                    )}
                  >
                    {i.kind === "analysis" ? (
                      <Target size={17} />
                    ) : (
                      <FileText size={17} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-grid font-medium">
                      {i.title}
                    </div>
                    <div className="truncate text-xs text-fg/50">{i.sub}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-grid text-lg font-semibold">
                      {i.score}
                    </div>
                    <div className="text-[11px] text-fg/40">
                      {i.kind === "analysis" ? "fit" : "ATS"}
                    </div>
                  </div>
                  <div className="hidden w-28 text-right text-xs text-fg/45 sm:block">
                    {new Date(i.at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

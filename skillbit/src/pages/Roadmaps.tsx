import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router"
import {
  Award,
  Check,
  ExternalLink,
  Flag,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Bar, Button, Empty, Panel, PageHeader, cx } from "../components/ui"
import { roadmapProgress } from "../lib/actions"
import { api, getToken, type BackendRecommendation } from "../lib/api"
import { generateRoadmap, type Roadmap } from "../lib/engine"
import { useUserData } from "../lib/store"

export default function Roadmaps() {
  const { data, update } = useUserData()
  const [params, setParams] = useSearchParams()
  const [custom, setCustom] = useState("")
  const [generating, setGenerating] = useState(false)

  const analysisId = params.get("analysisId") ?? data.analyses[0]?.id ?? null
  const active = params.get("skill") ?? data.roadmaps[0]?.skill ?? null
  const entry = data.roadmaps.find(
    (r) => r.skill.toLowerCase() === (active ?? "").toLowerCase(),
  )

  // Fetch backend recommendations for the latest/selected analysis
  useEffect(() => {
    if (!analysisId || !getToken()) return
    api
      .getRecommendations(analysisId)
      .then((recs) => {
        if (!Array.isArray(recs) || recs.length === 0) return
        update((d) => {
          const nextMap = { ...(d.recommendationsBySkill ?? {}) }
          const existingSkills = new Set(
            d.roadmaps.map((r) => r.skill.toLowerCase()),
          )
          const addedRoadmaps = [...d.roadmaps]
          for (const rec of recs) {
            nextMap[rec.skill_name] = rec
            if (!existingSkills.has(rec.skill_name.toLowerCase())) {
              addedRoadmaps.push({
                skill: rec.skill_name,
                role:
                  d.analyses.find((a) => a.id === analysisId)?.jobTitle ||
                  d.profile.targetRole ||
                  "Software Engineer",
                createdAt: Date.now(),
              })
              existingSkills.add(rec.skill_name.toLowerCase())
            }
          }
          return {
            ...d,
            recommendationsBySkill: nextMap,
            roadmaps: addedRoadmaps,
          }
        })
      })
      .catch(() => {
        // ignore if offline
      })
  }, [analysisId, update])

  const backendRec: BackendRecommendation | undefined = useMemo(() => {
    if (!active || !data.recommendationsBySkill) return undefined
    const exact = data.recommendationsBySkill[active]
    if (exact) return exact
    const key = Object.keys(data.recommendationsBySkill).find(
      (k) => k.toLowerCase() === active.toLowerCase(),
    )
    return key ? data.recommendationsBySkill[key] : undefined
  }, [active, data.recommendationsBySkill])

  const roadmap: Roadmap | null = useMemo(() => {
    if (!active) return null
    const role =
      entry?.role ?? data.profile.targetRole ?? "Software Engineer"
    const base = generateRoadmap(active, role)

    if (backendRec?.learning_path && backendRec.learning_path.length > 0) {
      return {
        skill: backendRec.skill_name || active,
        role,
        docs:
          backendRec.resource_url ||
          backendRec.learning_path[0]?.doc_url ||
          base.docs,
        capstone: backendRec.practice_project || base.capstone,
        stages: backendRec.learning_path.map((st, i) => ({
          id: `${st.stage_number || i + 1}`,
          title: st.stage_title || base.stages[i]?.title || `Stage ${i + 1}`,
          duration:
            st.estimated_duration || base.stages[i]?.duration || "4–6 days",
          milestone:
            st.practice_milestone || base.stages[i]?.milestone || "",
          topics: (st.topics_in_sequence || []).map((label, j) => ({
            id: `${i + 1}.${j + 1}`,
            label,
          })),
        })),
      }
    }
    return base
  }, [active, entry?.role, data.profile.targetRole, backendRec])

  const done = new Set(active ? (data.progress[active] ?? []) : [])
  const totalTopics = roadmap
    ? roadmap.stages.reduce((acc, s) => acc + s.topics.length, 0) || 16
    : 16
  const pct = active
    ? Math.min(100, Math.round((done.size / totalTopics) * 100))
    : 0

  const latest = data.analyses[0]
  const suggestions = (latest?.result.gaps ?? [])
    .filter(
      (g) =>
        g.status !== "STRONG_MATCH" &&
        !data.roadmaps.some(
          (r) => r.skill.toLowerCase() === g.skill.toLowerCase(),
        ),
    )
    .slice(0, 6)

  const ensure = async (skill: string, role?: string) => {
    const targetRole =
      role ?? (data.profile.targetRole || "Software Engineer")
    update((d) =>
      d.roadmaps.some((r) => r.skill.toLowerCase() === skill.toLowerCase())
        ? d
        : {
            ...d,
            roadmaps: [
              {
                skill,
                role: targetRole,
                createdAt: Date.now(),
              },
              ...d.roadmaps,
            ],
          },
    )
    setParams({ skill })

    // Also generate via backend AI if not already cached
    if (getToken() && !data.recommendationsBySkill?.[skill]) {
      setGenerating(true)
      try {
        const res = await api.generateCustomRoadmap({
          skill_name: skill,
          target_role: targetRole,
          candidate_level: "Intermediate",
        })
        update((d) => ({
          ...d,
          llmProvider: res.provider || d.llmProvider,
          recommendationsBySkill: {
            ...(d.recommendationsBySkill ?? {}),
            [skill]: {
              skill_id: skill.toLowerCase(),
              skill_name: skill,
              gap_status: "EXPLORE",
              priority: "MEDIUM",
              learning_topic: `Sequential Roadmap for ${skill}`,
              concepts: ["Foundations", "Core Patterns", "Production"],
              learning_path: res.learning_path,
              practice_project: `Build and deploy an end-to-end ${targetRole.toLowerCase()} project using ${skill}, with benchmarks in the README.`,
              resource_url: res.learning_path?.[0]?.doc_url,
            },
          },
        }))
      } catch {
        // local engine already covers it
      } finally {
        setGenerating(false)
      }
    }
  }

  const handleRegenerateAiRoadmap = async () => {
    if (!active) return
    const targetRole =
      entry?.role ?? data.profile.targetRole ?? "Software Engineer"
    setGenerating(true)
    try {
      if (getToken()) {
        const res = await api.generateCustomRoadmap({
          skill_name: active,
          target_role: targetRole,
          candidate_level: "Intermediate",
        })
        update((d) => ({
          ...d,
          llmProvider: res.provider || d.llmProvider,
          recommendationsBySkill: {
            ...(d.recommendationsBySkill ?? {}),
            [active]: {
              ...(d.recommendationsBySkill?.[active] ?? {
                skill_id: active.toLowerCase(),
                skill_name: active,
                gap_status: "EXPLORE",
                priority: "MEDIUM",
                learning_topic: `Sequential Roadmap for ${active}`,
                concepts: [],
              }),
              learning_path: res.learning_path,
            },
          },
        }))
      }
    } catch {
      // ignore if offline
    } finally {
      setGenerating(false)
    }
  }

  const toggle = (id: string) => {
    if (!active) return
    if (!entry) ensure(active)
    update((d) => {
      const cur = new Set(d.progress[active] ?? [])
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
      return { ...d, progress: { ...d.progress, [active]: [...cur] } }
    })
  }

  const addCustom = (e: FormEvent) => {
    e.preventDefault()
    const v = custom.trim()
    if (!v) return
    ensure(v)
    setCustom("")
  }

  return (
    <>
      <PageHeader
        eyebrow={`Recommendations · ${data.llmProvider || "SkillBit Engine"}`}
        title="Learning roadmaps"
        desc="Every gap becomes four sequential stages — foundations, architecture, production and a capstone that proves competence on your resume."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <Panel title="Your roadmaps">
            <ul className="divide-y divide-fg/10">
              {data.roadmaps.length === 0 && (
                <li className="px-5 py-4 text-sm text-fg/55">None yet.</li>
              )}
              {data.roadmaps.map((r) => {
                const rec = data.recommendationsBySkill?.[r.skill]
                const count = rec?.learning_path
                  ? rec.learning_path.reduce(
                      (a, s) => a + (s.topics_in_sequence?.length || 0),
                      0,
                    ) || 16
                  : 16
                const doneCount = data.progress[r.skill]?.length ?? 0
                const p = Math.min(
                  100,
                  count
                    ? Math.round((doneCount / count) * 100)
                    : roadmapProgress(data.progress, r.skill),
                )
                return (
                  <li
                    key={r.skill}
                    className={cx(
                      "group flex items-center gap-2 pr-2",
                      active === r.skill && "bg-fg/[0.06]",
                    )}
                  >
                    <button
                      onClick={() => setParams({ skill: r.skill })}
                      className="min-w-0 flex-1 px-5 py-3.5 text-left"
                    >
                      <div className="flex justify-between gap-2 text-sm">
                        <span
                          className={cx(
                            "truncate font-grid font-medium",
                            active === r.skill && "text-accent",
                          )}
                        >
                          {r.skill}
                        </span>
                        <span className="font-grid text-fg/45">{p}%</span>
                      </div>
                      <Bar
                        value={p}
                        className="mt-2"
                        tone={p === 100 ? "bg-fg" : "bg-accent"}
                      />
                    </button>
                    <button
                      aria-label={`Remove ${r.skill} roadmap`}
                      className="p-1.5 text-fg/30 opacity-0 hover:text-accent group-hover:opacity-100 focus:opacity-100"
                      onClick={() => {
                        update((d) => ({
                          ...d,
                          roadmaps: d.roadmaps.filter(
                            (x) => x.skill !== r.skill,
                          ),
                        }))
                        if (active === r.skill) setParams({})
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
            <form
              onSubmit={addCustom}
              className="flex gap-2 border-t border-fg/10 p-4"
            >
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="field py-2 text-sm"
                placeholder="Any skill, e.g. Rust"
                aria-label="Custom skill"
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                aria-label="Add roadmap"
                className="h-auto"
                disabled={generating}
              >
                <Plus size={16} />
              </Button>
            </form>
          </Panel>

          {suggestions.length > 0 && (
            <Panel
              title="Suggested from latest match"
              eyebrow={latest?.jobTitle}
            >
              <div className="flex flex-wrap gap-2 p-4">
                {suggestions.map((g) => (
                  <button
                    key={g.skill}
                    onClick={() => ensure(g.skill, latest?.jobTitle)}
                    className="inline-flex items-center gap-1.5 border border-fg/15 px-2.5 py-1.5 font-grid text-sm transition-colors hover:border-accent hover:text-accent"
                  >
                    <Plus size={13} /> {g.skill}
                  </button>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {!roadmap ? (
          <Panel corners>
            <Empty
              icon={<Route size={24} />}
              title="Pick a skill to start"
              body="Generate a roadmap from a gap in your match report, from the suggestions, or type any skill."
            />
          </Panel>
        ) : (
          <div>
            <Panel corners>
              <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-grid text-[11px] uppercase tracking-[0.2em] text-accent">
                    Roadmap · for {roadmap.role}
                  </div>
                  <h2 className="mt-2 font-grid text-4xl font-semibold">
                    {roadmap.skill}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <a
                      href={roadmap.docs}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-fg/60 hover:text-fg"
                    >
                      Official documentation <ExternalLink size={13} />
                    </a>
                    <button
                      type="button"
                      disabled={generating}
                      onClick={handleRegenerateAiRoadmap}
                      className="inline-flex items-center gap-1.5 font-grid text-xs text-accent hover:underline disabled:opacity-40"
                    >
                      <RefreshCw
                        size={12}
                        className={generating ? "animate-spin" : ""}
                      />
                      {generating ? "Generating AI steps…" : "Regenerate with AI"}
                    </button>
                  </div>
                </div>
                <div className="w-full md:w-64">
                  <div className="mb-2 flex justify-between font-grid text-sm">
                    <span className="text-fg/60">
                      {done.size} / {totalTopics} topics
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <Bar value={pct} tone={pct === 100 ? "bg-fg" : "bg-accent"} />
                  {!entry && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-3 w-full"
                      onClick={() => ensure(roadmap.skill)}
                    >
                      Save to my roadmaps
                    </Button>
                  )}
                </div>
              </div>
            </Panel>

            <ol className="relative mt-6 space-y-5 pl-8 md:pl-12">
              <span className="absolute bottom-6 left-[11px] top-6 w-px bg-fg/15 md:left-[19px]" />
              {roadmap.stages.map((st) => {
                const n = st.topics.filter((t) => done.has(t.id)).length
                const complete = n === st.topics.length
                return (
                  <li key={st.id} className="relative">
                    <span
                      className={cx(
                        "absolute -left-8 top-5 grid size-6 place-items-center border font-grid text-[11px] md:-left-12 md:size-10 md:text-sm",
                        complete
                          ? "border-fg bg-fg text-canvas"
                          : n
                            ? "border-accent bg-accent text-canvas"
                            : "border-fg/30 bg-canvas text-fg/60",
                      )}
                    >
                      {complete ? <Check size={16} /> : `0${st.id}`}
                    </span>
                    <div className="border border-fg/12 bg-surface/60">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fg/10 px-5 py-4">
                        <div>
                          <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/45">
                            Stage {st.id} · {st.duration}
                          </div>
                          <h3 className="mt-1 font-grid text-lg font-semibold">
                            {st.title}
                          </h3>
                        </div>
                        <span className="font-grid text-sm text-fg/50">
                          {n}/{st.topics.length}
                        </span>
                      </div>
                      <ul className="grid gap-px bg-fg/[0.06] sm:grid-cols-2">
                        {st.topics.map((t) => {
                          const on = done.has(t.id)
                          return (
                            <li key={t.id} className="bg-surface">
                              <label className="flex cursor-pointer items-start gap-3 px-5 py-3.5 transition-colors hover:bg-fg/[0.04]">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => toggle(t.id)}
                                  className="sr-only"
                                />
                                <span
                                  className={cx(
                                    "mt-0.5 grid size-[18px] shrink-0 place-items-center border",
                                    on
                                      ? "border-accent bg-accent text-canvas"
                                      : "border-fg/35",
                                  )}
                                >
                                  {on && <Check size={13} strokeWidth={3} />}
                                </span>
                                <span
                                  className={cx(
                                    "text-sm leading-relaxed",
                                    on
                                      ? "text-fg/45 line-through"
                                      : "text-fg/85",
                                  )}
                                >
                                  {t.label}
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                      <div className="flex items-center gap-2 px-5 py-3 text-xs text-fg/50">
                        <Flag size={13} className="text-accent" /> Milestone:{" "}
                        {st.milestone}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="mt-6 border border-accent/40 bg-accent/[0.08] p-5">
              <div className="font-grid text-[11px] uppercase tracking-[0.2em] text-accent">
                Capstone
              </div>
              <p className="mt-2 leading-relaxed text-fg/85">
                {roadmap.capstone}
              </p>
            </div>

            {(backendRec?.certification_name ||
              backendRec?.suggested_resume_bullet) && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {backendRec.certification_name && (
                  <div className="border border-fg/12 bg-surface/60 p-4">
                    <div className="flex items-center gap-2 font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
                      <Award size={14} className="text-accent" /> Recommended
                      credential
                    </div>
                    <p className="mt-2 text-sm text-fg/85">
                      {backendRec.certification_name}
                    </p>
                  </div>
                )}
                {backendRec.suggested_resume_bullet && (
                  <div className="border border-fg/12 bg-surface/60 p-4">
                    <div className="flex items-center gap-2 font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
                      <Sparkles size={14} className="text-accent" /> Target STAR
                      resume bullet
                    </div>
                    <p className="mt-2 text-sm italic text-fg/80">
                      “{backendRec.suggested_resume_bullet}”
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

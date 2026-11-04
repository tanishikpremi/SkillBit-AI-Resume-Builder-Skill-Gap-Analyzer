import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  EyeOff,
  FileText,
  Filter,
  Globe,
  Layers,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react"
import {
  Bar,
  Button,
  Empty,
  Label,
  Modal,
  PageHeader,
  Panel,
  ScoreGauge,
  cx,
} from "../components/ui"
import {
  api,
  getToken,
  type BackendCandidateProfileSnapshot,
  type BackendJobRecommendation,
  type BackendJobSearchRun,
  type BackendJobSource,
  type BackendUserJobPreferences,
} from "../lib/api"
import { useApp } from "../lib/store"

const PROGRESS_STAGES = [
  { num: 1, label: "Understanding your profile" },
  { num: 2, label: "Generating search queries" },
  { num: 3, label: "Searching job sources" },
  { num: 4, label: "Analyzing opportunities" },
  { num: 5, label: "Checking job availability" },
  { num: 6, label: "Ranking recommendations" },
  { num: 7, label: "Preparing your results" },
]

const CATEGORY_TABS = [
  { id: "all", label: "Recommended" },
  { id: "best_match", label: "Best Matches" },
  { id: "latest", label: "Latest" },
  { id: "internship", label: "Internships" },
  { id: "fresher_friendly", label: "Fresher-Friendly" },
  { id: "remote", label: "Remote" },
  { id: "startup", label: "Startups & Niche" },
  { id: "saved", label: "Saved Jobs" },
  { id: "applied", label: "Applied" },
]

function AvailabilityBadge({ status }: { status: string }) {
  const tone =
    status === "Active" || status === "Recently Published"
      ? "border-accent/50 bg-accent/10 text-accent"
      : status === "Closing Soon"
        ? "border-fg/35 bg-fg/10 text-fg"
        : "border-fg/20 bg-fg/[0.04] text-fg/55"
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-grid text-[10px] uppercase tracking-[0.14em]",
        tone,
      )}
    >
      <span
        className={cx(
          "size-1.5 rounded-full",
          status === "Active" || status === "Recently Published"
            ? "bg-accent"
            : "bg-fg/40",
        )}
      />
      {status}
    </span>
  )
}

function EligibilityBadge({ status }: { status: string }) {
  const isConfirmed = status === "Confirmed eligibility"
  const isLikely = status === "Likely eligibility"
  const isNotEligible = status === "Not eligible based on available information"
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 border px-2 py-0.5 font-grid text-[10px] uppercase tracking-[0.12em]",
        isConfirmed
          ? "border-accent/60 bg-accent/15 text-accent"
          : isLikely
            ? "border-fg/30 bg-fg/[0.06] text-fg"
            : isNotEligible
              ? "border-fg/20 bg-fg/[0.03] text-fg/45 line-through"
              : "border-fg/20 bg-fg/[0.04] text-fg/65",
      )}
    >
      {isConfirmed ? (
        <ShieldCheck size={11} />
      ) : isNotEligible ? (
        <ShieldAlert size={11} />
      ) : null}
      {status}
    </span>
  )
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "Recently"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "Recently"
  }
}

export default function JobFinder() {
  const { data } = useApp()
  const navigate = useNavigate()

  const [recommendations, setRecommendations] = useState<
    BackendJobRecommendation[]
  >([])
  const [snapshot, setSnapshot] =
    useState<BackendCandidateProfileSnapshot | null>(null)
  const [preferences, setPreferences] =
    useState<BackendUserJobPreferences | null>(null)
  const [sources, setSources] = useState<BackendJobSource[]>([])
  const [searchRun, setSearchRun] = useState<BackendJobSearchRun | null>(null)

  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [rebuildingProfile, setRebuildingProfile] = useState(false)
  const [verifyingJobId, setVerifyingJobId] = useState<string | null>(null)
  const [bannerNote, setBannerNote] = useState("")

  // Active tab & filters
  const [activeTab, setActiveTab] = useState("all")
  const [roleFilter, setRoleFilter] = useState("")
  const [skillFilter, setSkillFilter] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [arrangementFilter, setArrangementFilter] = useState("all")
  const [empTypeFilter, setEmpTypeFilter] = useState("all")
  const [expLevelFilter, setExpLevelFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0)
  const [selectedResumeFilter, setSelectedResumeFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Modals
  const [selectedRec, setSelectedRec] =
    useState<BackendJobRecommendation | null>(null)
  const [prefsModalOpen, setPrefsModalOpen] = useState(false)
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false)

  // Preferences form state
  const [prefRolesInput, setPrefRolesInput] = useState("")
  const [altRolesInput, setAltRolesInput] = useState("")
  const [prefLocsInput, setPrefLocsInput] = useState("")
  const [prefIndustriesInput, setPrefIndustriesInput] = useState("")
  const [exclCompaniesInput, setExclCompaniesInput] = useState("")
  const [exclCategoriesInput, setExclCategoriesInput] = useState("")
  const [remoteOnlyInput, setRemoteOnlyInput] = useState(false)
  const [internPrefInput, setInternPrefInput] = useState("both")
  const [minScorePrefInput, setMinScorePrefInput] = useState(30)
  const [salaryMinInput, setSalaryMinInput] = useState("")
  const [overrideInferredInput, setOverrideInferredInput] = useState(false)
  const [consentLlmInput, setConsentLlmInput] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)

  const syncPrefsForm = (p: BackendUserJobPreferences) => {
    setPrefRolesInput((p.preferred_roles || []).join(", "))
    setAltRolesInput((p.alternative_roles || []).join(", "))
    setPrefLocsInput((p.preferred_locations || []).join(", "))
    setPrefIndustriesInput((p.preferred_industries || []).join(", "))
    setExclCompaniesInput((p.excluded_companies || []).join(", "))
    setExclCategoriesInput((p.excluded_categories || []).join(", "))
    setRemoteOnlyInput(Boolean(p.remote_only))
    setInternPrefInput(p.internship_preference || "both")
    setMinScorePrefInput(p.min_match_score ?? 30)
    setSalaryMinInput(p.salary_min ? String(p.salary_min) : "")
    setOverrideInferredInput(Boolean(p.override_inferred_roles))
    setConsentLlmInput(p.consent_external_llm !== false)
  }

  const loadInitialData = async () => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [recsRes, snapRes, prefsRes, srcRes, histRes] = await Promise.all([
        api.getJobRecommendations(),
        api.getCandidateContext(),
        api.getJobPreferences(),
        api.getDiscoverySources(),
        api.getJobSearchHistory(),
      ])
      setRecommendations(recsRes)
      setSnapshot(snapRes)
      setPreferences(prefsRes)
      syncPrefsForm(prefsRes)
      setSources(srcRes)
      if (histRes && histRes.length > 0) {
        setSearchRun(histRes[0])
      }
    } catch (err) {
      setBannerNote(
        (err as Error).message ||
          "Could not load job recommendations from backend.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const fetchFilteredRecommendations = async () => {
    if (!getToken()) return
    try {
      const res = await api.getJobRecommendations({
        category_tab: activeTab,
        role: roleFilter || undefined,
        skill: skillFilter || undefined,
        location: locationFilter || undefined,
        work_arrangement:
          arrangementFilter !== "all" ? arrangementFilter : undefined,
        employment_type: empTypeFilter !== "all" ? empTypeFilter : undefined,
        experience_level: expLevelFilter !== "all" ? expLevelFilter : undefined,
        source: sourceFilter !== "all" ? sourceFilter : undefined,
        min_match_score: minScoreFilter > 0 ? minScoreFilter : undefined,
        resume_id: selectedResumeFilter || undefined,
      })
      setRecommendations(res)
    } catch {
      // ignore transient filter fetch errors
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchFilteredRecommendations()
    }
  }, [
    activeTab,
    arrangementFilter,
    empTypeFilter,
    expLevelFilter,
    sourceFilter,
    minScoreFilter,
    selectedResumeFilter,
  ])

  const handleRunDiscovery = async () => {
    if (!getToken()) return
    setSearching(true)
    setBannerNote("")
    try {
      const customQ = roleFilter.trim() ? [roleFilter.trim()] : undefined
      const runRes = await api.startJobDiscoverySearch({
        custom_queries: customQ,
        force_refresh_profile: true,
        run_in_background: false,
      })
      setSearchRun(runRes)
      const [recsRes, snapRes] = await Promise.all([
        api.getJobRecommendations({ category_tab: activeTab }),
        api.getCandidateContext(),
      ])
      setRecommendations(recsRes)
      setSnapshot(snapRes)
      setBannerNote(
        `Discovery complete: evaluated ${runRes.total_discovered} verified opportunities across multi-source feeds (${runRes.duplicates_consolidated} duplicates consolidated).`,
      )
    } catch (err) {
      setBannerNote((err as Error).message || "Job discovery failed.")
    } finally {
      setSearching(false)
    }
  }

  const handleRebuildContext = async () => {
    if (!getToken()) return
    setRebuildingProfile(true)
    try {
      const snap = await api.rebuildCandidateContext()
      setSnapshot(snap)
      await fetchFilteredRecommendations()
      setBannerNote(
        `Rebuilt unified candidate intelligence across Master Profile and ${snap.resume_count_analyzed} saved resume(s).`,
      )
    } catch (err) {
      setBannerNote((err as Error).message || "Failed to rebuild profile.")
    } finally {
      setRebuildingProfile(false)
    }
  }

  const handleToggleSave = async (rec: BackendJobRecommendation) => {
    const jobId = rec.job_listing_id
    try {
      if (rec.is_saved) {
        await api.unsaveJob(jobId)
        setRecommendations((prev) =>
          prev.map((r) =>
            r.job_listing_id === jobId ? { ...r, is_saved: false } : r,
          ),
        )
        if (selectedRec?.job_listing_id === jobId) {
          setSelectedRec({ ...selectedRec, is_saved: false })
        }
      } else {
        await api.saveJob(jobId)
        setRecommendations((prev) =>
          prev.map((r) =>
            r.job_listing_id === jobId ? { ...r, is_saved: true } : r,
          ),
        )
        if (selectedRec?.job_listing_id === jobId) {
          setSelectedRec({ ...selectedRec, is_saved: true })
        }
      }
    } catch {
      // ignore error
    }
  }

  const handleDismiss = async (rec: BackendJobRecommendation) => {
    const jobId = rec.job_listing_id
    try {
      await api.dismissJobRecommendation(jobId)
      setRecommendations((prev) =>
        prev.filter((r) => r.job_listing_id !== jobId),
      )
      if (selectedRec?.job_listing_id === jobId) {
        setSelectedRec(null)
      }
    } catch {
      // ignore error
    }
  }

  const handleMarkApplied = async (
    rec: BackendJobRecommendation,
    openExternalUrl = false,
  ) => {
    const jobId = rec.job_listing_id
    if (openExternalUrl && rec.job.application_url) {
      window.open(rec.job.application_url, "_blank", "noopener,noreferrer")
    }
    try {
      const appRes = await api.applyToJob(jobId, {
        resume_id: rec.best_resume_id || undefined,
        status: "Applied",
        applied_via_url: rec.job.application_url,
      })
      setRecommendations((prev) =>
        prev.map((r) =>
          r.job_listing_id === jobId
            ? {
                ...r,
                application_status: appRes.status,
                applied_at: appRes.applied_at,
              }
            : r,
        ),
      )
      if (selectedRec?.job_listing_id === jobId) {
        setSelectedRec({
          ...selectedRec,
          application_status: appRes.status,
          applied_at: appRes.applied_at,
        })
      }
    } catch {
      // ignore error
    }
  }

  const handleVerifyJob = async (jobId: string) => {
    setVerifyingJobId(jobId)
    try {
      const updatedJob = await api.verifyJobListing(jobId, true)
      setRecommendations((prev) =>
        prev.map((r) =>
          r.job_listing_id === jobId ? { ...r, job: updatedJob } : r,
        ),
      )
      if (selectedRec?.job_listing_id === jobId) {
        setSelectedRec({ ...selectedRec, job: updatedJob })
      }
    } finally {
      setVerifyingJobId(null)
    }
  }

  const handleSavePreferences = async () => {
    setSavingPrefs(true)
    try {
      const splitCsv = (s: string) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      const updated = await api.updateJobPreferences({
        preferred_roles: splitCsv(prefRolesInput),
        alternative_roles: splitCsv(altRolesInput),
        preferred_locations: splitCsv(prefLocsInput),
        preferred_industries: splitCsv(prefIndustriesInput),
        excluded_companies: splitCsv(exclCompaniesInput),
        excluded_categories: splitCsv(exclCategoriesInput),
        remote_only: remoteOnlyInput,
        internship_preference: internPrefInput,
        min_match_score: Number(minScorePrefInput) || 0,
        salary_min: salaryMinInput ? Number(salaryMinInput) : null,
        override_inferred_roles: overrideInferredInput,
        consent_external_llm: consentLlmInput,
      })
      setPreferences(updated)
      setPrefsModalOpen(false)
      await Promise.all([
        fetchFilteredRecommendations(),
        api.getCandidateContext().then(setSnapshot),
      ])
      setBannerNote(
        "Preferences updated and recommendations re-ranked against your settings.",
      )
    } catch (err) {
      setBannerNote(
        (err as Error).message || "Failed to update job preferences.",
      )
    } finally {
      setSavingPrefs(false)
    }
  }

  const unified = snapshot?.unified_profile_json || {}
  const conflicts = snapshot?.resume_conflicts_json || []
  const inferredRoles: string[] = unified.inferred_roles || []
  const adjacentRoles: string[] = unified.adjacent_roles || []
  const unifiedSkills: any[] = unified.skills || []
  const resumeSummaries: any[] = unified.resume_summaries || []

  const kpis = useMemo(() => {
    const eligible = recommendations.filter(
      (r) =>
        r.eligibility_status !== "Not eligible based on available information",
    )
    const bestMatches = eligible.filter((r) => r.match_score >= 70).length
    const internships = recommendations.filter(
      (r) => r.job.is_internship || r.job.is_fresher_friendly,
    ).length
    const savedCount = recommendations.filter((r) => r.is_saved).length
    const appliedCount = recommendations.filter(
      (r) => r.application_status,
    ).length
    return { bestMatches, internships, savedCount, appliedCount }
  }, [recommendations])

  return (
    <>
      <PageHeader
        eyebrow={`Proactive Career Intelligence · ${data?.llmProvider || "SkillBit Hybrid Engine"}`}
        title="AI Job Finder & Opportunity Engine"
        desc="Discovers, verifies, deduplicates and ranks opportunities across job portals, direct company career pages, Hacker News/Reddit communities and niche startup boards using your complete Master Profile and all saved resumes."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSourcesModalOpen(true)}
            >
              <Globe size={15} /> Sources ({sources.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPrefsModalOpen(true)}
            >
              <SlidersHorizontal size={15} /> Preferences
            </Button>
            <Button
              variant="primary"
              onClick={handleRunDiscovery}
              disabled={searching}
            >
              {searching ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Compass size={16} />
              )}
              {searching ? "Discovering opportunities…" : "Discover jobs now"}
            </Button>
          </div>
        }
      />

      {bannerNote && (
        <div className="mb-5 flex items-center justify-between gap-3 border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="shrink-0 text-accent" />
            <span>{bannerNote}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNote("")}
            className="text-xs text-fg/60 hover:text-fg"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 7-Stage Discovery Progress Bar when running or recently completed */}
      {(searching || searchRun) && (
        <Panel
          className="mb-6"
          eyebrow={
            searching
              ? `Stage ${searchRun?.current_stage || 3} of 7 · Live Discovery`
              : `Last Discovery Run · ${searchRun?.status?.toUpperCase() || "READY"}`
          }
          title={
            searching
              ? "Scanning multi-source job feeds & evaluating candidate fit…"
              : `${searchRun?.total_discovered || recommendations.length} verified opportunities evaluated (${searchRun?.duplicates_consolidated || 0} duplicates consolidated)`
          }
          action={
            <div className="flex items-center gap-2">
              {searchRun?.generated_queries &&
                searchRun.generated_queries.length > 0 && (
                  <span className="font-grid text-xs text-fg/50">
                    {searchRun.generated_queries.length} AI search queries
                  </span>
                )}
            </div>
          }
        >
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {PROGRESS_STAGES.map((st) => {
                const activeStage = searching
                  ? 3
                  : (searchRun?.current_stage ?? 7)
                const done = st.num <= activeStage
                return (
                  <div
                    key={st.num}
                    className={cx(
                      "border px-2.5 py-2 text-xs transition-colors",
                      done
                        ? "border-accent/45 bg-accent/10 text-fg"
                        : "border-fg/12 bg-fg/[0.02] text-fg/45",
                    )}
                  >
                    <div className="font-grid text-[10px] uppercase tracking-[0.14em] text-accent">
                      0{st.num}
                    </div>
                    <div className="mt-0.5 line-clamp-2 font-medium leading-snug">
                      {st.label}
                    </div>
                  </div>
                )
              })}
            </div>

            {searchRun?.generated_queries &&
              searchRun.generated_queries.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="mr-1 font-grid text-[10px] uppercase tracking-[0.16em] text-fg/45">
                    Queries executed:
                  </span>
                  {searchRun.generated_queries.slice(0, 8).map((q) => (
                    <span
                      key={q}
                      className="border border-fg/15 bg-fg/[0.03] px-2 py-0.5 font-mono text-[11px] text-fg/75"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              )}

            {searchRun?.sources_queried &&
              searchRun.sources_queried.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-fg/10 pt-3">
                  <span className="font-grid text-[10px] uppercase tracking-[0.16em] text-fg/45">
                    Source telemetry:
                  </span>
                  {searchRun.sources_queried.map((s, idx) => (
                    <span
                      key={`${s.source}-${idx}`}
                      title={s.message || s.status}
                      className={cx(
                        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-grid text-[10px] uppercase tracking-[0.12em]",
                        s.status === "ok"
                          ? "border-accent/40 bg-accent/10 text-fg"
                          : "border-fg/15 bg-fg/[0.03] text-fg/50",
                      )}
                    >
                      <span
                        className={cx(
                          "size-1.5 rounded-full",
                          s.status === "ok" ? "bg-accent" : "bg-fg/35",
                        )}
                      />
                      {s.source}:{" "}
                      {s.status === "ok"
                        ? `${s.jobs_found} found`
                        : "unavailable / key required"}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </Panel>
      )}

      {/* Candidate Unified Intelligence Summary & Contradiction Alerts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          eyebrow={`Unified Candidate Context · ${snapshot?.resume_count_analyzed ?? 0} Resume(s) + Master Profile`}
          title={unified.headline || "Candidate Career Intelligence"}
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRebuildContext}
              disabled={rebuildingProfile}
            >
              <RefreshCw
                size={14}
                className={rebuildingProfile ? "animate-spin" : ""}
              />{" "}
              Rebuild context
            </Button>
          }
        >
          <div className="space-y-3 p-5 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fg/70">
              <span>
                <b className="font-grid uppercase text-fg">Stage:</b>{" "}
                {unified.career_stage || "Early Career"}
              </span>
              <span>
                <b className="font-grid uppercase text-fg">Experience:</b>{" "}
                {unified.total_experience_years ?? 0} yrs
              </span>
              <span>
                <b className="font-grid uppercase text-fg">Location:</b>{" "}
                {unified.location || "Remote"}
              </span>
              <span>
                <b className="font-grid uppercase text-fg">Verified Skills:</b>{" "}
                {unifiedSkills.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-grid text-[10px] uppercase tracking-[0.16em] text-accent">
                Target roles:
              </span>
              {inferredRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRoleFilter(r)
                    setTimeout(fetchFilteredRecommendations, 50)
                  }}
                  className="border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-grid text-xs text-fg hover:bg-accent/20"
                >
                  {r}
                </button>
              ))}
              {adjacentRoles.slice(0, 4).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRoleFilter(r)
                    setTimeout(fetchFilteredRecommendations, 50)
                  }}
                  className="border border-fg/15 bg-fg/[0.03] px-2.5 py-0.5 font-grid text-xs text-fg/70 hover:border-accent hover:text-fg"
                >
                  + {r}
                </button>
              ))}
            </div>

            {conflicts.length > 0 && (
              <div className="mt-2 border border-accent/45 bg-accent/10 p-3 text-xs">
                <div className="flex items-center gap-2 font-grid uppercase tracking-[0.14em] text-accent">
                  <AlertTriangle size={14} /> {conflicts.length} Cross-Resume
                  Contradiction(s) Flagged
                </div>
                <ul className="mt-1.5 space-y-1 text-fg/80">
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      <b>{c.entity}</b> ({c.field}): {c.resolution}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-fg/12 bg-surface/60 p-4">
            <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/50">
              High-Fit Matches
            </div>
            <div className="mt-2 font-grid text-3xl font-semibold text-accent">
              {kpis.bestMatches}
            </div>
            <div className="mt-1 text-xs text-fg/55">
              70%+ match & eligible
            </div>
          </div>
          <div className="border border-fg/12 bg-surface/60 p-4">
            <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/50">
              Internships & Fresher
            </div>
            <div className="mt-2 font-grid text-3xl font-semibold text-fg">
              {kpis.internships}
            </div>
            <div className="mt-1 text-xs text-fg/55">
              Entry & trainee friendly
            </div>
          </div>
          <div className="border border-fg/12 bg-surface/60 p-4">
            <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/50">
              Saved Opportunities
            </div>
            <div className="mt-2 font-grid text-3xl font-semibold text-fg">
              {kpis.savedCount}
            </div>
            <div className="mt-1 text-xs text-fg/55">Bookmarked for review</div>
          </div>
          <div className="border border-fg/12 bg-surface/60 p-4">
            <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/50">
              Applications Tracked
            </div>
            <div className="mt-2 font-grid text-3xl font-semibold text-fg">
              {kpis.appliedCount}
            </div>
            <div className="mt-1 text-xs text-fg/55">Marked as applied</div>
          </div>
        </div>
      </div>

      {/* Category Tabs & Filter Bar */}
      <div className="mb-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fg/12 pb-3">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={cx(
                  "border px-3 py-1.5 font-grid text-xs uppercase tracking-[0.12em] transition-colors",
                  activeTab === t.id
                    ? "border-accent bg-accent/15 text-fg"
                    : "border-fg/15 text-fg/60 hover:border-fg/35 hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {resumeSummaries.length > 0 && (
              <select
                aria-label="Filter by saved resume"
                value={selectedResumeFilter}
                onChange={(e) => setSelectedResumeFilter(e.target.value)}
                className="field py-1.5 text-xs"
              >
                <option value="">All Saved Resumes ({resumeSummaries.length})</option>
                {resumeSummaries.map((r) => (
                  <option key={r.resume_id} value={r.resume_id}>
                    Best for: {r.title}
                  </option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter size={14} /> {showFilters ? "Hide filters" : "Filters"}
            </Button>
          </div>
        </div>

        {/* Search & Multi-Faceted Filter Drawer */}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg/45"
            />
            <input
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && fetchFilteredRecommendations()
              }
              placeholder="Filter by role title, keyword or company…"
              className="field pl-9 py-2 text-sm"
            />
          </div>
          <input
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && fetchFilteredRecommendations()
            }
            placeholder="Filter by skill (e.g. Python, React, Figma, SQL)…"
            className="field py-2 text-sm"
          />
          <Button
            variant="ghost"
            onClick={fetchFilteredRecommendations}
          >
            Apply filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-3 border border-fg/12 bg-surface/50 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="f-loc">Location</Label>
              <input
                id="f-loc"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g. Remote, San Francisco, Bengaluru"
                className="field py-1.5 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="f-arr">Work Arrangement</Label>
              <select
                id="f-arr"
                value={arrangementFilter}
                onChange={(e) => setArrangementFilter(e.target.value)}
                className="field py-1.5 text-xs"
              >
                <option value="all">All Arrangements</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div>
              <Label htmlFor="f-emp">Employment Type</Label>
              <select
                id="f-emp"
                value={empTypeFilter}
                onChange={(e) => setEmpTypeFilter(e.target.value)}
                className="field py-1.5 text-xs"
              >
                <option value="all">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
            <div>
              <Label htmlFor="f-exp">Experience Level</Label>
              <select
                id="f-exp"
                value={expLevelFilter}
                onChange={(e) => setExpLevelFilter(e.target.value)}
                className="field py-1.5 text-xs"
              >
                <option value="all">All Levels</option>
                <option value="fresher">Fresher / Entry-Level</option>
                <option value="internship">Internship / Student</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior / Lead</option>
              </select>
            </div>
            <div>
              <Label htmlFor="f-score">
                Min Match Score: {minScoreFilter}%
              </Label>
              <input
                id="f-score"
                type="range"
                min={0}
                max={90}
                step={5}
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                className="mt-2 w-full accent-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Recommendations Grid */}
      {loading ? (
        <Panel>
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-fg/60">
            <LoaderCircle size={20} className="animate-spin text-accent" />
            <span>Evaluating candidate intelligence and ranking opportunities…</span>
          </div>
        </Panel>
      ) : recommendations.length === 0 ? (
        <Panel corners>
          <Empty
            icon={<Compass size={26} />}
            title="No matching opportunities for current filter"
            body="Try clearing active filters or click Discover jobs now to scan multi-source feeds."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setActiveTab("all")
                  setRoleFilter("")
                  setSkillFilter("")
                  setLocationFilter("")
                  setArrangementFilter("all")
                  setEmpTypeFilter("all")
                  setExpLevelFilter("all")
                  setMinScoreFilter(0)
                  setSelectedResumeFilter("")
                }}
              >
                Reset filters
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {recommendations.map((rec) => {
            const job = rec.job
            const evCount = job.source_evidences?.length || 1
            return (
              <div
                key={rec.id}
                className={cx(
                  "flex flex-col justify-between border bg-surface/65 p-5 transition-colors",
                  rec.match_score >= 72 &&
                    rec.eligibility_status !==
                      "Not eligible based on available information"
                    ? "border-accent/45"
                    : "border-fg/12 hover:border-fg/30",
                )}
              >
                <div>
                  {/* Top Row: Source, Availability & Match Score */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <AvailabilityBadge status={job.availability_status} />
                        <EligibilityBadge status={rec.eligibility_status} />
                        {rec.application_status && (
                          <span className="inline-flex items-center gap-1 border border-accent bg-accent/20 px-2 py-0.5 font-grid text-[10px] uppercase tracking-[0.14em] text-accent">
                            <Check size={11} /> {rec.application_status}
                          </span>
                        )}
                      </div>
                      <h3 className="font-grid text-xl font-semibold leading-snug text-fg">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg/65">
                        <span className="inline-flex items-center gap-1 font-medium text-fg">
                          <Building2 size={13} className="text-accent" />
                          {job.company}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} />
                          {job.location || "Remote"}
                        </span>
                        <span className="border border-fg/15 px-1.5 py-px font-grid text-[10px] uppercase">
                          {job.work_arrangement}
                        </span>
                        <span className="border border-fg/15 px-1.5 py-px font-grid text-[10px] uppercase">
                          {job.employment_type}
                        </span>
                      </div>
                    </div>

                    {/* Job Match Score Box */}
                    <div className="shrink-0 border border-fg/15 bg-canvas/80 px-3.5 py-2 text-right">
                      <div className="font-grid text-[10px] uppercase tracking-[0.14em] text-fg/45">
                        Job Match Score
                      </div>
                      <div className="font-grid text-2xl font-semibold text-accent">
                        {rec.match_score}%
                      </div>
                    </div>
                  </div>

                  {/* Metadata & Source Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-fg/10 py-2 text-xs text-fg/55">
                    <span>
                      <b className="text-fg/75">Exp:</b>{" "}
                      {job.experience_requirements || "Entry / Mid"}
                    </span>
                    {job.salary_text && (
                      <span>
                        <b className="text-fg/75">Comp:</b> {job.salary_text}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Globe size={12} className="text-accent" />
                      {job.primary_source}
                      {evCount > 1 && (
                        <span className="border border-accent/40 bg-accent/10 px-1.5 py-px font-grid text-[10px] text-accent">
                          +{evCount - 1} source{evCount > 2 ? "s" : ""} consolidated
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {formatShortDate(job.published_at || job.discovered_at)}
                    </span>
                  </div>

                  {/* Why Recommended */}
                  <p className="mt-3 text-sm leading-relaxed text-fg/80">
                    {rec.why_recommended}
                  </p>

                  {/* Skills Match Chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rec.strong_matching_skills.slice(0, 5).map((sk) => (
                      <span
                        key={sk}
                        className="border border-accent/45 bg-accent/10 px-2 py-0.5 font-grid text-[11px] text-fg"
                      >
                        ✓ {sk}
                      </span>
                    ))}
                    {rec.partially_matching_skills.slice(0, 3).map((sk) => (
                      <span
                        key={sk}
                        className="border border-fg/25 bg-fg/[0.05] px-2 py-0.5 font-grid text-[11px] text-fg/75"
                      >
                        ~ {sk}
                      </span>
                    ))}
                    {rec.missing_skills.slice(0, 3).map((sk) => (
                      <span
                        key={sk}
                        className="border border-fg/15 bg-fg/[0.02] px-2 py-0.5 font-grid text-[11px] text-fg/45"
                      >
                        Missing: {sk}
                      </span>
                    ))}
                  </div>

                  {rec.best_resume_title && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-fg/60">
                      <FileText size={13} className="text-accent" />
                      <span>
                        Best supporting resume:{" "}
                        <b className="text-fg">{rec.best_resume_title}</b>
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-fg/10 pt-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setSelectedRec(rec)}
                    >
                      <Target size={14} /> View Match & Details
                    </Button>
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 border border-fg/20 bg-fg/[0.04] px-3 py-1.5 font-grid text-xs text-fg transition-colors hover:border-accent hover:text-accent"
                    >
                      Apply <ExternalLink size={13} />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSave(rec)}
                      title={rec.is_saved ? "Unsave job" : "Save job"}
                      className={cx(
                        "inline-flex items-center gap-1 border px-2.5 py-1.5 font-grid text-xs transition-colors",
                        rec.is_saved
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-fg/15 text-fg/60 hover:border-fg/35 hover:text-fg",
                      )}
                    >
                      {rec.is_saved ? (
                        <BookmarkCheck size={14} />
                      ) : (
                        <Bookmark size={14} />
                      )}
                      {rec.is_saved ? "Saved" : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkApplied(rec, false)}
                      title="Mark as Applied"
                      className={cx(
                        "inline-flex items-center gap-1 border px-2.5 py-1.5 font-grid text-xs transition-colors",
                        rec.application_status
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-fg/15 text-fg/60 hover:border-fg/35 hover:text-fg",
                      )}
                    >
                      <CheckCircle2 size={14} />
                      {rec.application_status ? "Applied" : "Mark Applied"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDismiss(rec)}
                      title="Dismiss recommendation"
                      className="border border-fg/15 p-1.5 text-fg/45 hover:border-fg/35 hover:text-fg"
                    >
                      <EyeOff size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detailed Recommendation & Match Explanation Modal (Section 8C) */}
      <Modal
        open={Boolean(selectedRec)}
        onClose={() => setSelectedRec(null)}
        title={
          selectedRec
            ? `${selectedRec.job.title} · ${selectedRec.job.company}`
            : "Job Details"
        }
        width="max-w-4xl"
      >
        {selectedRec && (
          <div className="space-y-6 text-sm">
            {/* Top Summary & Radial Score */}
            <div className="grid gap-6 border border-fg/12 bg-fg/[0.02] p-5 md:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center justify-center">
                <ScoreGauge value={selectedRec.match_score} size={155} />
                <div className="mt-2 text-center font-grid text-[10px] uppercase tracking-[0.14em] text-fg/50">
                  Recommendation Match Score
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <AvailabilityBadge
                    status={selectedRec.job.availability_status}
                  />
                  <EligibilityBadge status={selectedRec.eligibility_status} />
                  <span className="border border-fg/15 px-2 py-0.5 font-grid text-[10px] uppercase">
                    {selectedRec.job.work_arrangement}
                  </span>
                  <span className="border border-fg/15 px-2 py-0.5 font-grid text-[10px] uppercase">
                    {selectedRec.job.employment_type}
                  </span>
                </div>

                <div>
                  <div className="font-grid text-xs uppercase tracking-[0.16em] text-accent">
                    Why this job matches you
                  </div>
                  <p className="mt-1 leading-relaxed text-fg/85">
                    {selectedRec.why_recommended}
                  </p>
                </div>

                {/* Multi-Factor Breakdown Bars */}
                <div className="grid gap-2.5 pt-2 sm:grid-cols-2">
                  {[
                    [
                      "Skill compatibility (25%)",
                      selectedRec.score_breakdown.skill_compatibility ?? 0,
                    ],
                    [
                      "Experience & projects (20%)",
                      selectedRec.score_breakdown
                        .experience_project_relevance ?? 0,
                    ],
                    [
                      "Role alignment (15%)",
                      selectedRec.score_breakdown.role_alignment ?? 0,
                    ],
                    [
                      "Education & eligibility (15%)",
                      selectedRec.score_breakdown.education_eligibility ?? 0,
                    ],
                    [
                      "Location & work mode (10%)",
                      selectedRec.score_breakdown.location_work_preference ?? 0,
                    ],
                    [
                      "Freshness & availability (10%)",
                      selectedRec.score_breakdown.job_freshness_availability ??
                        0,
                    ],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <div className="mb-1 flex justify-between font-grid text-[10px] uppercase tracking-[0.12em] text-fg/60">
                        <span>{label}</span>
                        <span className="text-fg">{val}%</span>
                      </div>
                      <Bar value={Number(val)} />
                    </div>
                  ))}
                </div>
                <p className="pt-1 text-[11px] italic text-fg/45">
                  Note: The Job Match Score measures profile and skill alignment;
                  it is not a probability of getting hired.
                </p>
              </div>
            </div>

            {/* Strengths & Gaps */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-fg/12 bg-fg/[0.02] p-4">
                <div className="font-grid text-xs uppercase tracking-[0.16em] text-accent">
                  Your strengths & supporting evidence
                </div>
                <div className="mt-3 space-y-2.5">
                  <div>
                    <div className="text-xs font-medium text-fg/70">
                      Strong Matching Skills:
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {selectedRec.strong_matching_skills.length > 0 ? (
                        selectedRec.strong_matching_skills.map((s) => (
                          <span
                            key={s}
                            className="border border-accent/50 bg-accent/10 px-2 py-0.5 font-grid text-xs text-fg"
                          >
                            ✓ {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-fg/50">
                          Transferable foundational skills
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedRec.relevant_projects.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-fg/70">
                        Relevant Projects:
                      </div>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-fg/80">
                        {selectedRec.relevant_projects.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-fg/10 pt-2 text-xs text-fg/70">
                    <div>
                      <b>Education:</b> {selectedRec.education_compatibility}
                    </div>
                    <div className="mt-1">
                      <b>Experience:</b> {selectedRec.experience_compatibility}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-fg/12 bg-fg/[0.02] p-4">
                <div className="font-grid text-xs uppercase tracking-[0.16em] text-fg/70">
                  Your gaps & potential concerns
                </div>
                <div className="mt-3 space-y-2.5">
                  {selectedRec.missing_skills.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-fg/70">
                        Missing / Unverified Skills:
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedRec.missing_skills.map((s) => (
                          <Link
                            key={s}
                            to={`/app/roadmaps?skill=${encodeURIComponent(s)}`}
                            className="inline-flex items-center gap-1 border border-fg/20 bg-fg/[0.04] px-2 py-0.5 font-grid text-xs text-fg/80 hover:border-accent hover:text-accent"
                          >
                            {s} <Route size={11} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRec.potential_concerns.length > 0 ? (
                    <ul className="list-disc space-y-1.5 pl-4 text-xs text-fg/75">
                      {selectedRec.potential_concerns.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-fg/60">
                      No major eligibility blockers detected.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* How to improve your chances & Best Resume Comparison */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-fg/12 bg-fg/[0.02] p-4">
                <div className="font-grid text-xs uppercase tracking-[0.16em] text-accent">
                  How to improve your chances
                </div>
                <ol className="mt-3 space-y-2 text-xs leading-relaxed text-fg/80">
                  {selectedRec.preparation_steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-grid text-accent">0{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedRec(null)
                      navigate("/app/builder")
                    }}
                  >
                    Tailor in Resume Builder (User-Approved)
                  </Button>
                  {selectedRec.missing_skills[0] && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const sk = selectedRec.missing_skills[0]
                        setSelectedRec(null)
                        navigate(`/app/roadmaps?skill=${encodeURIComponent(sk)}`)
                      }}
                    >
                      <Route size={13} /> Open {selectedRec.missing_skills[0]}{" "}
                      Roadmap
                    </Button>
                  )}
                </div>
              </div>

              <div className="border border-fg/12 bg-fg/[0.02] p-4">
                <div className="font-grid text-xs uppercase tracking-[0.16em] text-accent">
                  Best saved resume for this job
                </div>
                {selectedRec.best_resume_title ? (
                  <div className="mt-3 space-y-2">
                    <div className="border border-accent/40 bg-accent/10 p-2.5 text-xs">
                      <div className="font-grid font-semibold text-fg">
                        ★ {selectedRec.best_resume_title}
                      </div>
                      <div className="mt-0.5 text-fg/75">
                        {selectedRec.best_resume_reason}
                      </div>
                    </div>
                    {selectedRec.resume_comparison.length > 1 && (
                      <div className="space-y-1 pt-1 text-xs">
                        <div className="font-grid text-[10px] uppercase tracking-[0.14em] text-fg/50">
                          All saved resumes compared:
                        </div>
                        {selectedRec.resume_comparison.map((rc) => (
                          <div
                            key={rc.resume_id}
                            className="flex items-center justify-between border border-fg/10 px-2.5 py-1.5"
                          >
                            <span className="truncate font-medium">
                              {rc.resume_title}
                            </span>
                            <span className="font-grid text-accent">
                              {rc.match_score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-fg/60">
                    Upload or save a resume in the Resumes tab to compare
                    resume-specific evidence.
                  </p>
                )}
              </div>
            </div>

            {/* Application Details, Original Posting & Consolidated Sources */}
            <div className="border border-fg/12 bg-fg/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-grid text-xs uppercase tracking-[0.16em] text-accent">
                  Original Job Posting & Verified Sources (
                  {selectedRec.job.source_evidences.length || 1})
                </div>
                <div className="flex items-center gap-2 text-xs text-fg/55">
                  <span>
                    Last verified:{" "}
                    {formatShortDate(selectedRec.job.last_verified_at)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={verifyingJobId === selectedRec.job.id}
                    onClick={() => handleVerifyJob(selectedRec.job.id)}
                  >
                    <RefreshCw
                      size={12}
                      className={
                        verifyingJobId === selectedRec.job.id
                          ? "animate-spin"
                          : ""
                      }
                    />{" "}
                    Verify availability
                  </Button>
                </div>
              </div>

              <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap border border-fg/10 bg-canvas p-3 font-sans text-xs leading-relaxed text-fg/80">
                {selectedRec.job.description}
              </pre>

              {selectedRec.job.source_evidences.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="font-grid text-[10px] uppercase tracking-[0.14em] text-fg/50">
                    Traceable discovery sources:
                  </div>
                  {selectedRec.job.source_evidences.map((ev, i) => (
                    <div
                      key={`${ev.source_url}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 border border-fg/10 bg-surface px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-grid font-medium text-fg">
                          {ev.source_name}
                        </span>{" "}
                        <span className="text-fg/50">
                          ({ev.source_category})
                        </span>
                        {ev.original_post_excerpt && (
                          <div className="mt-0.5 text-fg/65">
                            {ev.original_post_excerpt}
                          </div>
                        )}
                      </div>
                      <a
                        href={ev.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-grid text-accent hover:underline"
                      >
                        Source URL <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-fg/10 pt-4">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={selectedRec.job.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-accent bg-accent px-4 py-2 font-grid text-xs font-semibold uppercase tracking-[0.12em] text-canvas"
                  >
                    Open Original Application Page <ExternalLink size={14} />
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkApplied(selectedRec, false)}
                  >
                    <CheckCircle2 size={14} />{" "}
                    {selectedRec.application_status
                      ? "Marked as Applied"
                      : "Mark as Applied"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleSave(selectedRec)}
                  >
                    {selectedRec.is_saved ? (
                      <>
                        <BookmarkCheck size={14} /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark size={14} /> Save Job
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Search Controls & User Job Preferences Modal (Section 9) */}
      <Modal
        open={prefsModalOpen}
        onClose={() => setPrefsModalOpen(false)}
        title="Job Discovery Controls & Preferences"
        width="max-w-3xl"
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-fg/65">
            Customize how SkillBit discovers and ranks opportunities. You can
            override automatically inferred roles so secondary skills on your
            resume do not generate unwanted recommendations.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-roles">
                Preferred Job Roles (comma-separated)
              </Label>
              <input
                id="p-roles"
                value={prefRolesInput}
                onChange={(e) => setPrefRolesInput(e.target.value)}
                placeholder="e.g. Full-Stack Engineer, Backend Developer"
                className="field text-xs"
              />
            </div>
            <div>
              <Label htmlFor="p-alt-roles">
                Alternative / Adjacent Roles
              </Label>
              <input
                id="p-alt-roles"
                value={altRolesInput}
                onChange={(e) => setAltRolesInput(e.target.value)}
                placeholder="e.g. Junior Python Developer, Data Analyst Intern"
                className="field text-xs"
              />
            </div>
            <div>
              <Label htmlFor="p-locs">
                Preferred Locations (comma-separated)
              </Label>
              <input
                id="p-locs"
                value={prefLocsInput}
                onChange={(e) => setPrefLocsInput(e.target.value)}
                placeholder="e.g. Remote, San Francisco, Bengaluru"
                className="field text-xs"
              />
            </div>
            <div>
              <Label htmlFor="p-ind">Preferred Industries</Label>
              <input
                id="p-ind"
                value={prefIndustriesInput}
                onChange={(e) => setPrefIndustriesInput(e.target.value)}
                placeholder="e.g. Developer Tools, AI, SaaS"
                className="field text-xs"
              />
            </div>
            <div>
              <Label htmlFor="p-intern">Internship / Full-Time Preference</Label>
              <select
                id="p-intern"
                value={internPrefInput}
                onChange={(e) => setInternPrefInput(e.target.value)}
                className="field text-xs"
              >
                <option value="both">Both Internships & Full-Time</option>
                <option value="internship_only">Internships & Trainee Only</option>
                <option value="fulltime_only">Full-Time Only</option>
              </select>
            </div>
            <div>
              <Label htmlFor="p-sal">Minimum Annual Salary (USD)</Label>
              <input
                id="p-sal"
                type="number"
                value={salaryMinInput}
                onChange={(e) => setSalaryMinInput(e.target.value)}
                placeholder="e.g. 70000"
                className="field text-xs"
              />
            </div>
            <div>
              <Label htmlFor="p-excl-comp">
                Excluded Companies (comma-separated)
              </Label>
              <input
                id="p-excl-comp"
                value={exclCompaniesInput}
                onChange={(e) => setExclCompaniesInput(e.target.value)}
                placeholder="Companies to hide"
                className="field text-xs"
              />
            </div>
            <div>
              <Label htmlFor="p-excl-cat">
                Excluded Job Categories (comma-separated)
              </Label>
              <input
                id="p-excl-cat"
                value={exclCategoriesInput}
                onChange={(e) => setExclCategoriesInput(e.target.value)}
                placeholder="e.g. Sales, Unrelated category"
                className="field text-xs"
              />
            </div>
          </div>

          <div className="space-y-2.5 border border-fg/12 bg-fg/[0.02] p-4 text-xs">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={remoteOnlyInput}
                onChange={(e) => setRemoteOnlyInput(e.target.checked)}
                className="size-4 accent-accent"
              />
              <span>
                <b>Remote-only preference:</b> Flag strictly on-site roles as
                not eligible.
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={overrideInferredInput}
                onChange={(e) => setOverrideInferredInput(e.target.checked)}
                className="size-4 accent-accent"
              />
              <span>
                <b>Override inferred resume roles:</b> Only search and rank
                using my explicitly entered Preferred & Alternative roles above.
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={consentLlmInput}
                onChange={(e) => setConsentLlmInput(e.target.checked)}
                className="size-4 accent-accent"
              />
              <span>
                <b>Consent-aware AI explanation:</b> Allow anonymized skill
                summaries (never contact details or raw resumes) to be processed
                by configured LLM providers for tailored explanations.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPrefsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSavePreferences}
              disabled={savingPrefs}
            >
              {savingPrefs ? "Saving…" : "Save preferences & re-rank"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Multi-Source Integrations Status Modal (Deliverable 12 & 13) */}
      <Modal
        open={sourcesModalOpen}
        onClose={() => setSourcesModalOpen(false)}
        title="Multi-Source Discovery Integrations & Status"
        width="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-fg/65">
            SkillBit transparently reports the status of every discovery
            adapter: working zero-key public APIs, direct company career feeds,
            integrations requiring API keys, and restricted platforms.
          </p>
          <div className="max-h-[420px] overflow-y-auto border border-fg/12">
            <table className="w-full text-left">
              <thead className="border-b border-fg/12 bg-fg/[0.04] font-grid text-[10px] uppercase tracking-[0.14em] text-fg/60">
                <tr>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Integration Mode</th>
                  <th className="px-3 py-2.5">Status / Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fg/10">
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2.5">
                      <div className="font-grid font-medium text-fg">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-fg/50">
                        {s.description}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-grid uppercase text-fg/65">
                      {s.category.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-fg/70">
                      {s.integration_mode}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.integration_mode === "working_public_api" ||
                      s.integration_mode === "working_search_feed" ||
                      s.api_key_configured ? (
                        <span className="inline-flex items-center gap-1 border border-accent/50 bg-accent/10 px-2 py-0.5 font-grid text-[10px] uppercase text-accent">
                          Active
                        </span>
                      ) : s.integration_mode === "limited_public_index" ? (
                        <span className="inline-flex items-center gap-1 border border-fg/25 bg-fg/[0.05] px-2 py-0.5 font-grid text-[10px] uppercase text-fg/75">
                          Limited Public Feed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 border border-fg/15 bg-fg/[0.02] px-2 py-0.5 font-grid text-[10px] uppercase text-fg/45">
                          Needs {s.api_key_env_var || "API Key"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </>
  )
}

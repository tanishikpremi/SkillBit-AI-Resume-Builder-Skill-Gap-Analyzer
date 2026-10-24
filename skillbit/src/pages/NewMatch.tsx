import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  Briefcase,
  FileUp,
  LoaderCircle,
  Target,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import {
  Button,
  ButtonLink,
  Empty,
  Label,
  Panel,
  PageHeader,
  cx,
} from "../components/ui"
import { createAnalysis } from "../lib/actions"
import { api, getToken } from "../lib/api"
import { parseJob } from "../lib/engine"
import { SAMPLE_JOB } from "../lib/sample"
import { mapBackendAnalysisToDoc, useUserData } from "../lib/store"

export default function NewMatch() {
  const { data, update, taxonomy, refreshFromBackend } = useUserData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [resumeId, setResumeId] = useState(
    params.get("resume") ?? data.resumes[0]?.id ?? "",
  )
  const [jobTitleInput, setJobTitleInput] = useState("")
  const [companyInput, setCompanyInput] = useState("")
  const [jd, setJd] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const job = useMemo(
    () => (jd.trim().length > 40 ? parseJob(jd, taxonomy) : null),
    [jd, taxonomy],
  )

  if (!data.resumes.length) {
    return (
      <>
        <PageHeader eyebrow="Job match" title="Match a job" />
        <Panel corners>
          <Empty
            icon={<FileUp size={24} />}
            title="Add a resume first"
            body="Matching compares a parsed resume against the job description."
            action={
              <ButtonLink to="/app/upload" variant="primary">
                Upload resume
              </ButtonLink>
            }
          />
        </Panel>
      </>
    )
  }

  const run = async () => {
    const resume =
      data.resumes.find((r) => r.id === resumeId) ?? data.resumes[0]
    if (!resume || !job) return
    setBusy(true)
    setErr("")

    try {
      if (getToken()) {
        // Ensure resume exists in backend DB (e.g., if it was a local sample resume)
        let targetResumeId = resume.id
        try {
          await api.getResumeById(targetResumeId)
        } catch {
          const createdRes = await api.createResume(resume.title, {
            raw_text: resume.text,
            ats_score: resume.parsed.atsScore,
            extracted_skills: resume.parsed.skills.map((s) => ({
              skill_id: s.name.toLowerCase(),
              canonical_name: s.name,
              category: s.category,
              evidence_level: s.evidence,
              evidence_snippets: [s.snippet],
              sections_found: ["experience", "skills"],
            })),
          })
          targetResumeId = createdRes.id
        }

        const effectiveTitle =
          jobTitleInput.trim() || job.title || "Target Software Role"
        const effectiveCompany =
          companyInput.trim() || job.company || "Target Company"

        // 1. Analyze & persist Job Description on Backend
        const jobRes = await api.analyzeJob({
          title: effectiveTitle,
          company: effectiveCompany,
          raw_text: jd,
        })

        // 2. Run Hybrid Match & Gap Analysis + LLM Insights on Backend
        const matchRes = await api.analyzeMatch(targetResumeId, jobRes.id)
        const doc = mapBackendAnalysisToDoc(matchRes, data.resumes, [
          jobRes,
          ...(data.jobs ?? []),
        ])
        // Preserve raw jobText & any local partial-match relatedSkill enrichments
        doc.jobText = jd
        doc.resumeTitle = resume.title

        update((d) => ({
          ...d,
          analyses: [doc, ...d.analyses.filter((x) => x.id !== doc.id)],
          jobs: [jobRes, ...(d.jobs ?? []).filter((j) => j.id !== jobRes.id)],
        }))
        refreshFromBackend()
        navigate(`/app/match/${doc.id}`)
        return
      }
    } catch (e) {
      // Fallback to local engine if backend fails or if no taxonomy skills matched in DB
      console.warn("Falling back to local match engine:", e)
    }

    const a = createAnalysis(resume, jd, taxonomy)
    if (jobTitleInput.trim()) {
      a.jobTitle = jobTitleInput.trim()
      a.job.title = jobTitleInput.trim()
    }
    if (companyInput.trim()) {
      a.company = companyInput.trim()
      a.job.company = companyInput.trim()
    }
    update((d) => ({ ...d, analyses: [a, ...d.analyses] }))
    setBusy(false)
    navigate(`/app/match/${a.id}`)
  }

  const handleDeleteJob = async (jobId: string) => {
    if (getToken()) {
      try {
        await api.deleteJob(jobId)
      } catch {
        // ignore
      }
    }
    update((d) => ({
      ...d,
      jobs: (d.jobs ?? []).filter((j) => j.id !== jobId),
    }))
  }

  const req = job?.skills.filter((s) => s.importance === "REQUIRED") ?? []
  const pref = job?.skills.filter((s) => s.importance === "PREFERRED") ?? []

  return (
    <>
      <PageHeader
        eyebrow="Job match"
        title="Match a job description"
        desc="Required skills weigh 1.0 and preferred skills 0.5. Fit blends exact matches (60%) with evidence strength or semantic similarity (40%)."
      />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel corners title="Inputs" eyebrow="Step 1 of 2">
          <div className="space-y-5 p-5">
            <div>
              <Label htmlFor="m-resume">Resume</Label>
              <select
                id="m-resume"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                className="field"
              >
                {data.resumes.map((r) => (
                  <option key={r.id} value={r.id} className="bg-surface">
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-title" hint="Optional override">
                  Role title
                </Label>
                <input
                  id="m-title"
                  value={jobTitleInput}
                  onChange={(e) => setJobTitleInput(e.target.value)}
                  className="field"
                  placeholder={job?.title || "e.g. Senior Backend Engineer"}
                />
              </div>
              <div>
                <Label htmlFor="m-company" hint="Optional">
                  Company
                </Label>
                <input
                  id="m-company"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  className="field"
                  placeholder={job?.company || "e.g. Nimbus Labs"}
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="m-jd"
                hint={
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => {
                      setJd(SAMPLE_JOB)
                      setJobTitleInput("Senior Full-Stack Engineer")
                      setCompanyInput("Nimbus Labs")
                    }}
                  >
                    Use sample job
                  </button>
                }
              >
                Job description
              </Label>
              <textarea
                id="m-jd"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={15}
                className="field scroll-thin text-[14px] leading-relaxed"
                placeholder="Paste the full job description, including requirements and nice-to-haves…"
              />
            </div>
            {err && (
              <div className="flex items-center gap-2 border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
                <TriangleAlert size={16} />
                <span>{err}</span>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              disabled={!job || !job.skills.length || busy}
              onClick={run}
            >
              {busy ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" /> Scoring
                  fit…
                </>
              ) : (
                <>
                  <Target size={20} /> Analyze match
                </>
              )}
            </Button>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Detected requirements" eyebrow="Live job parse">
            {!job ? (
              <Empty
                icon={<Target size={24} />}
                title="Waiting for a job description"
                body="Title, seniority and weighted requirements appear here as you paste."
              />
            ) : (
              <div className="space-y-6 p-5">
                <div className="grid grid-cols-2 gap-px bg-fg/10">
                  {[
                    ["Title", jobTitleInput.trim() || job.title],
                    ["Company", companyInput.trim() || job.company || "—"],
                    ["Seniority", job.seniority],
                    ["Skills", `${req.length} req · ${pref.length} pref`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-surface p-3">
                      <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/45">
                        {k}
                      </div>
                      <div className="mt-1 truncate font-grid font-medium">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
                {[
                  ["Required · weight 1.0", req, true],
                  ["Preferred · weight 0.5", pref, false],
                ].map(([label, list, r]) => (
                  <div key={label as string}>
                    <div className="mb-2 font-grid text-[12px] uppercase tracking-[0.16em] text-fg/55">
                      {label as string}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(list as typeof req).length === 0 && (
                        <span className="text-sm text-fg/40">
                          None detected
                        </span>
                      )}
                      {(list as typeof req).map((s) => (
                        <span
                          key={s.name}
                          className={cx(
                            "border px-2.5 py-1 font-grid text-sm",
                            r ? "border-fg/40" : "border-fg/15 text-fg/70",
                          )}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {data.jobs && data.jobs.length > 0 && (
            <Panel
              title="Saved job descriptions"
              eyebrow={`${data.jobs.length} analyzed`}
            >
              <ul className="divide-y divide-fg/10">
                {data.jobs.slice(0, 5).map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setJd(j.raw_text)
                        setJobTitleInput(j.title)
                        setCompanyInput(j.company || "")
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate font-grid text-sm font-medium hover:text-accent">
                        {j.title}
                      </div>
                      <div className="truncate text-xs text-fg/50">
                        {j.company || "Direct posting"} ·{" "}
                        {j.seniority_level || "Mid"} ·{" "}
                        {j.job_skills?.length ?? 0} skills
                      </div>
                    </button>
                    <Briefcase size={15} className="shrink-0 text-fg/40" />
                    <button
                      type="button"
                      onClick={() => handleDeleteJob(j.id)}
                      className="p-1.5 text-fg/40 hover:text-accent"
                      aria-label={`Delete ${j.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}

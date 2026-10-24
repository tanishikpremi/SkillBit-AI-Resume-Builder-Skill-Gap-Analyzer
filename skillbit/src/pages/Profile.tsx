import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import {
  Briefcase,
  Check,
  Download,
  FolderGit2,
  GraduationCap,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  Wrench,
} from "lucide-react"
import {
  Button,
  Label,
  Modal,
  Panel,
  PageHeader,
} from "../components/ui"
import { download } from "../lib/actions"
import { api, getToken } from "../lib/api"
import {
  emptyDraft,
  useApp,
  type Profile as ProfileT,
} from "../lib/store"

interface ProfileField {
  k: keyof ProfileT
  label: string
  placeholder?: string
}

const FIELDS: ProfileField[] = [
  {
    k: "headline",
    label: "Headline",
    placeholder: "Backend engineer · Go, Kafka",
  },
  {
    k: "targetRole",
    label: "Target role",
    placeholder: "Senior Software Engineer",
  },
  { k: "location", label: "Location", placeholder: "San Francisco, CA" },
  { k: "phone", label: "Phone", placeholder: "+1 (555) 234-5678" },
  { k: "website", label: "Website / Portfolio" },
  { k: "linkedin", label: "LinkedIn" },
  { k: "github", label: "GitHub" },
]

export default function Profile() {
  const {
    user,
    data,
    update,
    logout,
    refreshFromBackend,
    backendSkills,
  } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProfileT>(
    data?.profile ?? {
      headline: "",
      location: "",
      phone: "",
      summary: "",
      targetRole: "",
      linkedin: "",
      github: "",
      website: "",
    },
  )
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")

  // Modals for Master Profile CRUD
  const [expModal, setExpModal] = useState(false)
  const [newExp, setNewExp] = useState({
    company: "",
    role_title: "",
    location: "",
    start_date: "",
    end_date: "Present",
    bullets: "",
  })

  const [projModal, setProjModal] = useState(false)
  const [newProj, setNewProj] = useState({
    title: "",
    technologies: "",
    repo_url: "",
    live_url: "",
    description: "",
  })

  const [eduModal, setEduModal] = useState(false)
  const [newEdu, setNewEdu] = useState({
    institution: "",
    degree: "",
    field_of_study: "",
    start_date: "",
    end_date: "",
    gpa: "",
  })

  const [skillId, setSkillId] = useState("")
  const [proficiency, setProficiency] = useState("Intermediate")

  useEffect(() => {
    if (data?.profile) {
      setForm(data.profile)
    }
  }, [data?.profile])

  if (!user || !data) return null

  const mp = data.masterProfile

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    update((d) => ({ ...d, profile: form }))
    if (getToken()) {
      try {
        await api.updateProfile({
          headline: form.headline,
          summary: form.summary,
          phone: form.phone,
          location: form.location,
          linkedin_url: form.linkedin,
          github_url: form.github,
          portfolio_url: form.website,
        })
        await refreshFromBackend()
      } catch {
        // local state already updated
      }
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSyncResume = async (resumeId?: string) => {
    setSyncing(true)
    setSyncMsg("")
    try {
      if (getToken()) {
        await api.syncProfileFromResume({ resume_id: resumeId, replace: true })
        await refreshFromBackend()
      }
      setSyncMsg("Master Profile synchronized from resume.")
      setTimeout(() => setSyncMsg(""), 3000)
    } catch (err) {
      setSyncMsg((err as Error).message || "Failed to sync from resume.")
      setTimeout(() => setSyncMsg(""), 3000)
    } finally {
      setSyncing(false)
    }
  }

  const handleAddExp = async (e: FormEvent) => {
    e.preventDefault()
    if (!newExp.company.trim() || !newExp.role_title.trim()) return
    try {
      if (getToken()) {
        await api.addProfileExperience({
          company: newExp.company.trim(),
          role_title: newExp.role_title.trim(),
          location: newExp.location.trim(),
          start_date: newExp.start_date.trim(),
          end_date: newExp.end_date.trim(),
          is_current: /present|current/i.test(newExp.end_date),
          bullets: newExp.bullets
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean),
        })
        await refreshFromBackend()
      }
      setExpModal(false)
      setNewExp({
        company: "",
        role_title: "",
        location: "",
        start_date: "",
        end_date: "Present",
        bullets: "",
      })
    } catch {
      setExpModal(false)
    }
  }

  const handleDeleteExp = async (id: string) => {
    if (getToken()) {
      try {
        await api.deleteProfileExperience(id)
        await refreshFromBackend()
      } catch {
        // ignore
      }
    }
  }

  const handleAddProj = async (e: FormEvent) => {
    e.preventDefault()
    if (!newProj.title.trim()) return
    try {
      if (getToken()) {
        await api.addProfileProject({
          title: newProj.title.trim(),
          description: newProj.description.trim(),
          technologies: newProj.technologies
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          repo_url: newProj.repo_url.trim(),
          live_url: newProj.live_url.trim(),
        })
        await refreshFromBackend()
      }
      setProjModal(false)
      setNewProj({
        title: "",
        technologies: "",
        repo_url: "",
        live_url: "",
        description: "",
      })
    } catch {
      setProjModal(false)
    }
  }

  const handleDeleteProj = async (id: string) => {
    if (getToken()) {
      try {
        await api.deleteProfileProject(id)
        await refreshFromBackend()
      } catch {
        // ignore
      }
    }
  }

  const handleAddEdu = async (e: FormEvent) => {
    e.preventDefault()
    if (!newEdu.institution.trim() || !newEdu.degree.trim()) return
    try {
      if (getToken()) {
        await api.addProfileEducation({
          institution: newEdu.institution.trim(),
          degree: newEdu.degree.trim(),
          field_of_study: newEdu.field_of_study.trim(),
          start_date: newEdu.start_date.trim(),
          end_date: newEdu.end_date.trim(),
          gpa: newEdu.gpa.trim(),
        })
        await refreshFromBackend()
      }
      setEduModal(false)
      setNewEdu({
        institution: "",
        degree: "",
        field_of_study: "",
        start_date: "",
        end_date: "",
        gpa: "",
      })
    } catch {
      setEduModal(false)
    }
  }

  const handleDeleteEdu = async (id: string) => {
    if (getToken()) {
      try {
        await api.deleteProfileEducation(id)
        await refreshFromBackend()
      } catch {
        // ignore
      }
    }
  }

  const handleAddSkill = async (e: FormEvent) => {
    e.preventDefault()
    if (!skillId || !getToken()) return
    try {
      await api.addProfileSkill({
        skill_id: skillId,
        proficiency,
      })
      setSkillId("")
      await refreshFromBackend()
    } catch {
      // ignore
    }
  }

  const handleDeleteSkill = async (id: string) => {
    if (getToken()) {
      try {
        await api.deleteProfileSkill(id)
        await refreshFromBackend()
      } catch {
        // ignore
      }
    }
  }

  const stats = [
    ["Resumes", data.resumes.length],
    ["Analyses", data.analyses.length],
    ["Roadmaps", data.roadmaps.length],
    [
      "Topics done",
      Object.values(data.progress).reduce((a, l) => a + l.length, 0),
    ],
  ]

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title={user.name}
        desc={`${user.email} · ${
          user.role === "admin" ? "Placement admin" : "Candidate"
        } · signed in with ${
          user.provider === "google" ? "Google" : "email"
        } · member since ${new Date(user.createdAt).toLocaleDateString()}`}
        actions={
          data.resumes.length > 0 ? (
            <Button
              variant="ghost"
              disabled={syncing}
              onClick={() => handleSyncResume()}
            >
              <RefreshCw
                size={16}
                className={syncing ? "animate-spin text-accent" : ""}
              />{" "}
              {syncing ? "Syncing…" : "Sync from latest resume"}
            </Button>
          ) : undefined
        }
      />

      {syncMsg && (
        <div className="mb-6 flex items-center gap-2 border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm">
          <Check size={16} className="text-accent" />
          <span>{syncMsg}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          corners
          title="Career profile"
          eyebrow="Used for roadmap targeting & ATS header"
        >
          <form onSubmit={submit} className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.k}>
                  <Label htmlFor={`p-${f.k}`}>{f.label}</Label>
                  <input
                    id={`p-${f.k}`}
                    value={form[f.k] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setForm({ ...form, [f.k]: e.target.value })
                    }
                    className="field"
                  />
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="p-summary">Summary</Label>
              <textarea
                id="p-summary"
                rows={4}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="field"
              />
            </div>
            <Button type="submit" variant="primary">
              {saved ? (
                <>
                  <Check size={17} /> Saved
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel title="Activity">
            <div className="grid grid-cols-2 gap-px bg-fg/10">
              {stats.map(([l, v]) => (
                <div key={l} className="bg-surface p-5">
                  <div className="font-grid text-3xl font-semibold">{v}</div>
                  <div className="mt-1 font-grid text-[11px] uppercase tracking-[0.16em] text-fg/50">
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {data.resumes.length > 0 && (
            <Panel
              title="Saved candidate profiles"
              eyebrow={`${data.resumes.length} resumes`}
            >
              <ul className="divide-y divide-fg/10">
                {data.resumes.slice(0, 4).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-grid text-sm font-medium">
                        {r.title}
                      </div>
                      <div className="text-xs text-fg/45">
                        ATS {r.parsed.atsScore} · {r.parsed.skills.length}{" "}
                        skills
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={syncing}
                        onClick={() => handleSyncResume(r.id)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/app/match?resume=${r.id}`)}
                      >
                        <Target size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Your data" eyebrow="Workspace export & controls">
            <div className="space-y-3 p-5">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() =>
                  download(
                    "skillbit-export.json",
                    JSON.stringify({ user, ...data }, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={17} /> Export all data (JSON)
              </Button>
              <Button
                variant="ghost"
                className="w-full hover:border-accent hover:text-accent"
                onClick={() => {
                  if (
                    !confirm(
                      "Delete all resumes, analyses and roadmaps? This cannot be undone.",
                    )
                  )
                    return
                  update((d) => ({
                    ...d,
                    resumes: [],
                    analyses: [],
                    roadmaps: [],
                    progress: {},
                    draft: emptyDraft(user.name, user.email),
                  }))
                }}
              >
                <Trash2 size={17} /> Clear my workspace
              </Button>
              <Button
                variant="quiet"
                className="w-full"
                onClick={() => {
                  logout()
                  navigate("/")
                }}
              >
                Log out
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Master Profile Structured Records (Experience, Projects, Education, Skills) */}
      {user.role !== "admin" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel
            eyebrow="Master profile"
            title={`Work experience (${mp?.experiences?.length ?? 0})`}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpModal(true)}
              >
                <Plus size={14} /> Add role
              </Button>
            }
          >
            <div className="divide-y divide-fg/10">
              {(!mp?.experiences || mp.experiences.length === 0) && (
                <p className="p-5 text-sm text-fg/55">
                  No work experience in Master Profile yet. Click “Sync from
                  latest resume” or add a role manually.
                </p>
              )}
              {mp?.experiences?.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-start justify-between gap-3 p-5"
                >
                  <div>
                    <div className="flex items-center gap-2 font-grid font-medium">
                      <Briefcase size={15} className="text-accent" />
                      {exp.role_title} ·{" "}
                      <span className="text-fg/65">{exp.company}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-fg/45">
                      {[exp.start_date, exp.is_current ? "Present" : exp.end_date]
                        .filter(Boolean)
                        .join(" – ")}
                      {exp.location ? ` · ${exp.location}` : ""}
                    </div>
                    {exp.bullets?.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-fg/75">
                        {exp.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteExp(exp.id)}
                    className="p-1.5 text-fg/40 hover:text-accent"
                    aria-label="Delete experience"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            eyebrow="Master profile"
            title={`Projects (${mp?.projects?.length ?? 0})`}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setProjModal(true)}
              >
                <Plus size={14} /> Add project
              </Button>
            }
          >
            <div className="divide-y divide-fg/10">
              {(!mp?.projects || mp.projects.length === 0) && (
                <p className="p-5 text-sm text-fg/55">
                  No projects recorded in Master Profile yet.
                </p>
              )}
              {mp?.projects?.map((proj) => (
                <div
                  key={proj.id}
                  className="flex items-start justify-between gap-3 p-5"
                >
                  <div>
                    <div className="flex items-center gap-2 font-grid font-medium">
                      <FolderGit2 size={15} className="text-accent" />
                      {proj.title}
                    </div>
                    {proj.technologies?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {proj.technologies.map((t) => (
                          <span
                            key={t}
                            className="border border-fg/15 px-2 py-px font-grid text-[11px] text-fg/70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {proj.description && (
                      <p className="mt-2 text-xs leading-relaxed text-fg/75">
                        {proj.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteProj(proj.id)}
                    className="p-1.5 text-fg/40 hover:text-accent"
                    aria-label="Delete project"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            eyebrow="Master profile"
            title={`Education (${mp?.educations?.length ?? 0})`}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEduModal(true)}
              >
                <Plus size={14} /> Add education
              </Button>
            }
          >
            <div className="divide-y divide-fg/10">
              {(!mp?.educations || mp.educations.length === 0) && (
                <p className="p-5 text-sm text-fg/55">
                  No education records in Master Profile yet.
                </p>
              )}
              {mp?.educations?.map((edu) => (
                <div
                  key={edu.id}
                  className="flex items-start justify-between gap-3 p-5"
                >
                  <div>
                    <div className="flex items-center gap-2 font-grid font-medium">
                      <GraduationCap size={15} className="text-accent" />
                      {edu.degree}
                      {edu.field_of_study ? ` in ${edu.field_of_study}` : ""}
                    </div>
                    <div className="mt-0.5 text-xs text-fg/60">
                      {edu.institution} ·{" "}
                      {[edu.start_date, edu.end_date]
                        .filter(Boolean)
                        .join(" – ")}
                      {edu.gpa ? ` · GPA ${edu.gpa}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEdu(edu.id)}
                    className="p-1.5 text-fg/40 hover:text-accent"
                    aria-label="Delete education"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            eyebrow="Master profile"
            title={`Verified skills (${mp?.user_skills?.length ?? 0})`}
          >
            <div className="space-y-4 p-5">
              {backendSkills.length > 0 && (
                <form
                  onSubmit={handleAddSkill}
                  className="flex flex-wrap gap-2"
                >
                  <select
                    value={skillId}
                    onChange={(e) => setSkillId(e.target.value)}
                    className="field flex-1 py-2 text-xs"
                  >
                    <option value="">Select canonical skill…</option>
                    {backendSkills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.canonical_name} ({s.category})
                      </option>
                    ))}
                  </select>
                  <select
                    value={proficiency}
                    onChange={(e) => setProficiency(e.target.value)}
                    className="field w-36 py-2 text-xs"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                  <Button type="submit" size="sm" variant="primary">
                    <Plus size={14} /> Add
                  </Button>
                </form>
              )}
              <div className="flex flex-wrap gap-2">
                {(!mp?.user_skills || mp.user_skills.length === 0) && (
                  <p className="text-sm text-fg/55">
                    No skills in Master Profile yet.
                  </p>
                )}
                {mp?.user_skills?.map((us) => (
                  <span
                    key={us.id}
                    className="inline-flex items-center gap-2 border border-fg/15 bg-fg/[0.03] px-2.5 py-1 text-xs"
                  >
                    <Wrench size={12} className="text-accent" />
                    <span className="font-grid font-medium">
                      {us.skill_name}
                    </span>
                    <span className="text-[10px] uppercase text-fg/45">
                      {us.proficiency}
                    </span>
                    <button
                      onClick={() => handleDeleteSkill(us.id)}
                      className="text-fg/40 hover:text-accent"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* Add Experience Modal */}
      <Modal
        open={expModal}
        onClose={() => setExpModal(false)}
        title="Add work experience"
      >
        <form onSubmit={handleAddExp} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Role title</Label>
              <input
                required
                value={newExp.role_title}
                onChange={(e) =>
                  setNewExp({ ...newExp, role_title: e.target.value })
                }
                className="field"
                placeholder="Senior Software Engineer"
              />
            </div>
            <div>
              <Label>Company</Label>
              <input
                required
                value={newExp.company}
                onChange={(e) =>
                  setNewExp({ ...newExp, company: e.target.value })
                }
                className="field"
                placeholder="Acme Cloud"
              />
            </div>
            <div>
              <Label>Start date</Label>
              <input
                value={newExp.start_date}
                onChange={(e) =>
                  setNewExp({ ...newExp, start_date: e.target.value })
                }
                className="field"
                placeholder="Jan 2022"
              />
            </div>
            <div>
              <Label>End date</Label>
              <input
                value={newExp.end_date}
                onChange={(e) =>
                  setNewExp({ ...newExp, end_date: e.target.value })
                }
                className="field"
                placeholder="Present"
              />
            </div>
          </div>
          <div>
            <Label hint="One per line">Accomplishment bullets</Label>
            <textarea
              rows={4}
              value={newExp.bullets}
              onChange={(e) =>
                setNewExp({ ...newExp, bullets: e.target.value })
              }
              className="field text-sm"
              placeholder="Architected microservices…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setExpModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save experience
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Project Modal */}
      <Modal
        open={projModal}
        onClose={() => setProjModal(false)}
        title="Add project"
      >
        <form onSubmit={handleAddProj} className="space-y-4">
          <div>
            <Label>Project title</Label>
            <input
              required
              value={newProj.title}
              onChange={(e) =>
                setNewProj({ ...newProj, title: e.target.value })
              }
              className="field"
              placeholder="Real-Time Event Pipeline"
            />
          </div>
          <div>
            <Label hint="Comma separated">Technologies</Label>
            <input
              value={newProj.technologies}
              onChange={(e) =>
                setNewProj({ ...newProj, technologies: e.target.value })
              }
              className="field"
              placeholder="Python, FastAPI, Docker, Redis"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Repository URL</Label>
              <input
                value={newProj.repo_url}
                onChange={(e) =>
                  setNewProj({ ...newProj, repo_url: e.target.value })
                }
                className="field"
                placeholder="https://github.com/you/repo"
              />
            </div>
            <div>
              <Label>Live Demo URL</Label>
              <input
                value={newProj.live_url}
                onChange={(e) =>
                  setNewProj({ ...newProj, live_url: e.target.value })
                }
                className="field"
              />
            </div>
          </div>
          <div>
            <Label>Description & impact</Label>
            <textarea
              rows={3}
              value={newProj.description}
              onChange={(e) =>
                setNewProj({ ...newProj, description: e.target.value })
              }
              className="field text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setProjModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Education Modal */}
      <Modal
        open={eduModal}
        onClose={() => setEduModal(false)}
        title="Add education"
      >
        <form onSubmit={handleAddEdu} className="space-y-4">
          <div>
            <Label>Institution</Label>
            <input
              required
              value={newEdu.institution}
              onChange={(e) =>
                setNewEdu({ ...newEdu, institution: e.target.value })
              }
              className="field"
              placeholder="University of California, Berkeley"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Degree</Label>
              <input
                required
                value={newEdu.degree}
                onChange={(e) =>
                  setNewEdu({ ...newEdu, degree: e.target.value })
                }
                className="field"
                placeholder="B.S."
              />
            </div>
            <div>
              <Label>Field of study</Label>
              <input
                value={newEdu.field_of_study}
                onChange={(e) =>
                  setNewEdu({ ...newEdu, field_of_study: e.target.value })
                }
                className="field"
                placeholder="Computer Science"
              />
            </div>
            <div>
              <Label>Start year</Label>
              <input
                value={newEdu.start_date}
                onChange={(e) =>
                  setNewEdu({ ...newEdu, start_date: e.target.value })
                }
                className="field"
                placeholder="2018"
              />
            </div>
            <div>
              <Label>Graduation year</Label>
              <input
                value={newEdu.end_date}
                onChange={(e) =>
                  setNewEdu({ ...newEdu, end_date: e.target.value })
                }
                className="field"
                placeholder="2022"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEduModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save education
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

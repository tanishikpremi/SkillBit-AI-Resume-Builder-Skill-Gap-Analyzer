import { useMemo, useRef, useState, type DragEvent } from "react"
import { useNavigate } from "react-router"
import {
  Briefcase,
  Check,
  FileText,
  FileUp,
  FolderGit2,
  GraduationCap,
  Hammer,
  Info,
  LoaderCircle,
  Target,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react"
import {
  Bar,
  Button,
  Empty,
  EvidenceBadge,
  Label,
  Panel,
  PageHeader,
  cx,
  timeAgo,
} from "../components/ui"
import { createResume } from "../lib/actions"
import { api, getToken } from "../lib/api"
import { parseResume, type ParsedResume, type SectionName } from "../lib/engine"
import { SAMPLE_RESUME } from "../lib/sample"
import {
  mapBackendResumeToDoc,
  structuredToBuilderDraft,
  useUserData,
  type ResumeDoc,
} from "../lib/store"

const SECTIONS: SectionName[] = [
  "Contact",
  "Summary",
  "Experience",
  "Projects",
  "Education",
  "Skills",
]

export function ParsedReport({ parsed }: { parsed: ParsedResume }) {
  const byCat = useMemo(() => {
    const m = new Map<string, ParsedResume["skills"]>()
    for (const s of parsed.skills)
      m.set(s.category, [...(m.get(s.category) ?? []), s])
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [parsed])
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-fg/12 p-4">
          <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
            ATS readiness
          </div>
          <div className="mt-2 font-grid text-3xl font-semibold">
            {parsed.atsScore}
          </div>
          <Bar
            value={parsed.atsScore}
            className="mt-3"
            tone={
              parsed.atsScore >= 75
                ? "bg-fg"
                : parsed.atsScore >= 55
                  ? "bg-fg/50"
                  : "bg-accent"
            }
          />
        </div>
        <div className="border border-fg/12 p-4">
          <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
            Skills detected
          </div>
          <div className="mt-2 font-grid text-3xl font-semibold">
            {parsed.skills.length}
          </div>
          <div className="mt-2 text-xs text-fg/50">
            {parsed.skills.filter((s) => s.evidence === "STRONG").length} with
            strong evidence
          </div>
        </div>
        <div className="border border-fg/12 p-4">
          <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/50">
            Quantified bullets
          </div>
          <div className="mt-2 font-grid text-3xl font-semibold">
            {Math.round(parsed.quantifiedRatio * 100)}%
          </div>
          <div className="mt-2 text-xs text-fg/50">
            of {parsed.bulletCount} bullets include a metric
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 font-grid text-[12px] uppercase tracking-[0.16em] text-fg/55">
          Sections
        </div>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const ok =
              s === "Contact"
                ? !!(parsed.contact.email || parsed.contact.phone)
                : !!parsed.sections[s]?.length
            return (
              <span
                key={s}
                className={cx(
                  "border px-2.5 py-1 font-grid text-xs",
                  ok
                    ? "border-fg/50 text-fg"
                    : "border-accent/40 text-accent/80 line-through",
                )}
              >
                {s}
              </span>
            )
          })}
        </div>
      </div>

      <div className="space-y-5">
        {byCat.length === 0 && (
          <p className="text-sm text-fg/55">
            No taxonomy skills detected yet. Make sure your resume has a Skills
            section and experience bullets.
          </p>
        )}
        {byCat.map(([cat, list]) => (
          <div key={cat}>
            <div className="mb-2 flex items-center gap-2 font-grid text-[12px] uppercase tracking-[0.16em] text-fg/55">
              <span className="size-1.5 bg-accent" /> {cat}{" "}
              <span className="text-fg/30">{list.length}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {list.map((s) => (
                <div
                  key={s.name}
                  className="border border-fg/10 bg-fg/[0.02] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-grid font-medium">{s.name}</span>
                    <EvidenceBadge tier={s.evidence} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg/50">
                    “{s.snippet}”
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Upload() {
  const { data, update, taxonomy, user, refreshFromBackend } = useUserData()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState("")
  const [title, setTitle] = useState("")
  const [fileName, setFileName] = useState<string>()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [drag, setDrag] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(
    data.resumes[0]?.id ?? null,
  )

  // Auto-generated profile decision prompt state
  const [uploadedDoc, setUploadedDoc] = useState<ResumeDoc | null>(null)
  const [profileTitleInput, setProfileTitleInput] = useState("")
  const [syncingProfile, setSyncingProfile] = useState(false)
  const [profileBanner, setProfileBanner] = useState("")

  const preview = useMemo(
    () => (text.trim().length > 40 ? parseResume(text, taxonomy) : null),
    [text, taxonomy],
  )
  const viewing = data.resumes.find((r) => r.id === selected)

  const readFile = async (f: File) => {
    setFileName(f.name)
    const defaultTitle = title || f.name.replace(/\.[^.]+$/, "")
    setTitle(defaultTitle)
    setPendingFile(f)
    setUploadedDoc(null)
    setProfileBanner("")

    if (f.size > 5 * 1024 * 1024) {
      setNote("File exceeds the 5 MB limit.")
      return
    }

    const ext = f.name.split(".").pop()?.toLowerCase()

    // Upload directly to Backend PyMuPDF / python-docx parser if authenticated
    if (getToken() && (ext === "pdf" || ext === "docx" || ext === "txt")) {
      setScanning(true)
      setNote("")
      try {
        const res = await api.uploadResume(f, defaultTitle)
        const doc = mapBackendResumeToDoc(res, taxonomy)
        update((d) => ({
          ...d,
          resumes: [doc, ...d.resumes.filter((x) => x.id !== doc.id)],
        }))
        setText(doc.text)
        setSelected(doc.id)
        setPendingFile(null)
        setUploadedDoc(doc)
        const gen = res.generated_profile || {}
        setProfileTitleInput(
          gen.full_name && gen.headline
            ? `${gen.full_name} — ${gen.headline}`
            : doc.title,
        )
        setScanning(false)
        refreshFromBackend()
        return
      } catch (err) {
        setScanning(false)
        if (ext === "pdf" || ext === "docx") {
          setNote(
            (err as Error).message ||
              "Could not parse binary file on server. Ensure the backend server is running on port 8000.",
          )
          return
        }
      }
    }

    if (ext === "pdf" || ext === "docx" || ext === "doc") {
      setNote(
        `Start the backend server on port 8000 to parse ${ext.toUpperCase()} files automatically, or paste the resume text below.`,
      )
      return
    }

    const reader = new FileReader()
    setScanning(true)
    reader.onload = () => {
      setText(String(reader.result ?? ""))
      setNote("")
      setTimeout(() => setScanning(false), 500)
    }
    reader.onerror = () => {
      setScanning(false)
      setNote("Could not read that file. Try pasting the text instead.")
    }
    reader.readAsText(f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) readFile(f)
  }

  const save = async (thenMatch: boolean) => {
    // If file was already uploaded and text wasn't modified, just navigate or select
    if (uploadedDoc && text === uploadedDoc.text) {
      setText("")
      setTitle("")
      setFileName(undefined)
      setSelected(uploadedDoc.id)
      if (thenMatch) navigate(`/app/match?resume=${uploadedDoc.id}`)
      return
    }

    setSaving(true)
    setNote("")
    try {
      if (getToken()) {
        const cleanTitle = title.trim() || "Untitled resume"
        const fileToUpload =
          pendingFile ??
          new File(
            [text],
            `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`,
            { type: "text/plain" },
          )
        const res = await api.uploadResume(fileToUpload, cleanTitle)
        const doc = mapBackendResumeToDoc(res, taxonomy)
        update((d) => ({
          ...d,
          resumes: [doc, ...d.resumes.filter((x) => x.id !== doc.id)],
        }))
        setText("")
        setTitle("")
        setFileName(undefined)
        setPendingFile(null)
        setSelected(doc.id)
        setUploadedDoc(doc)
        const gen = res.generated_profile || {}
        setProfileTitleInput(
          gen.full_name && gen.headline
            ? `${gen.full_name} — ${gen.headline}`
            : doc.title,
        )
        refreshFromBackend()
        if (thenMatch) navigate(`/app/match?resume=${doc.id}`)
        return
      }
    } catch {
      // Fallback to local creation if backend is unreachable
    } finally {
      setSaving(false)
    }

    const doc = createResume(
      text,
      title,
      fileName ? "uploaded" : "pasted",
      taxonomy,
      fileName,
    )
    update((d) => ({ ...d, resumes: [doc, ...d.resumes] }))
    setText("")
    setTitle("")
    setFileName(undefined)
    setPendingFile(null)
    setSelected(doc.id)
    if (thenMatch) navigate(`/app/match?resume=${doc.id}`)
  }

  const handleSyncToProfile = async (goToMatch: boolean) => {
    if (!uploadedDoc) return
    setSyncingProfile(true)
    try {
      const chosenTitle =
        profileTitleInput.trim() || uploadedDoc.title || "Candidate Profile"
      if (getToken()) {
        await api.syncProfileFromResume({
          resume_id: uploadedDoc.id,
          replace: true,
          profile_title: chosenTitle,
        })
        await refreshFromBackend()
      }
      setProfileBanner(
        `Saved "${chosenTitle}" as your active Master Candidate Profile.`,
      )
      const targetId = uploadedDoc.id
      setUploadedDoc(null)
      if (goToMatch) {
        navigate(`/app/match?resume=${targetId}`)
      }
    } catch (err) {
      setNote((err as Error).message || "Failed to sync profile.")
    } finally {
      setSyncingProfile(false)
    }
  }

  const handleUseExistingProfileForMatch = async () => {
    if (!uploadedDoc) return
    const targetId = uploadedDoc.existingResumeId || uploadedDoc.id
    if (
      uploadedDoc.isExactProfileMatch &&
      uploadedDoc.existingResumeId &&
      uploadedDoc.existingResumeId !== uploadedDoc.id &&
      getToken()
    ) {
      try {
        await api.deleteResume(uploadedDoc.id)
        update((d) => ({
          ...d,
          resumes: d.resumes.filter((r) => r.id !== uploadedDoc.id),
        }))
      } catch {
        // ignore cleanup error
      }
    }
    setUploadedDoc(null)
    navigate(`/app/match?resume=${targetId}`)
  }

  const handleDeleteResume = async (r: ResumeDoc) => {
    if (!confirm(`Delete “${r.title}”?`)) return
    if (getToken()) {
      try {
        await api.deleteResume(r.id)
      } catch {
        // ignore if local-only
      }
    }
    update((d) => ({
      ...d,
      resumes: d.resumes.filter((x) => x.id !== r.id),
    }))
    if (selected === r.id) setSelected(null)
    if (uploadedDoc?.id === r.id) setUploadedDoc(null)
  }

  const handleOpenInBuilder = (r: ResumeDoc) => {
    if (r.structured) {
      const draft = structuredToBuilderDraft(
        r.structured,
        user.name,
        user.email,
        r.id,
        r.title,
      )
      update((d) => ({ ...d, draft }))
    }
    navigate("/app/builder")
  }

  const genProfile = uploadedDoc?.generatedProfile || {}

  return (
    <>
      <PageHeader
        eyebrow="Resumes"
        title="Upload & parse"
        desc="We classify six sections and grade every skill by evidence: STRONG (action verb + metric), MODERATE, LISTED (skills section only) or MENTIONED."
      />

      {profileBanner && (
        <Panel className="mb-6" corners>
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3 text-sm">
              <Check size={18} className="text-accent" />
              <span>{profileBanner}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/app/profile")}
              >
                View profile
              </Button>
              {selected && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/app/match?resume=${selected}`)}
                >
                  <Target size={15} /> Match a job
                </Button>
              )}
            </div>
          </div>
        </Panel>
      )}

      {uploadedDoc && (
        <Panel
          className="mb-6"
          corners
          eyebrow={
            uploadedDoc.isExactProfileMatch
              ? "Exact existing profile match detected"
              : "Auto-generated candidate profile"
          }
          title={
            uploadedDoc.isExactProfileMatch
              ? `Matches your existing profile “${uploadedDoc.existingProfileTitle || uploadedDoc.title}”`
              : "Save extracted information as your Master Profile?"
          }
        >
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-fg/70">
              {uploadedDoc.isExactProfileMatch
                ? "No changes were detected in your contact details, work history, education, projects, or skills compared to your existing profile. You can jump straight to Job Match with your existing profile or save this as a new profile."
                : "We automatically extracted a structured career profile from your uploaded resume. Review the summary below and choose whether to sync it to your Master Profile."}
            </p>

            {!uploadedDoc.isExactProfileMatch && (
              <div className="grid gap-3 border border-fg/12 bg-fg/[0.02] p-4 sm:grid-cols-2">
                <div>
                  <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/45">
                    Candidate & headline
                  </div>
                  <div className="mt-1 font-grid text-sm font-medium">
                    {genProfile.full_name || user.name} ·{" "}
                    <span className="text-accent">
                      {genProfile.headline || "Software Professional"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-grid text-[10px] uppercase tracking-[0.18em] text-fg/45">
                    Extracted records
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-fg/70">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={13} className="text-accent" />
                      {genProfile.experiences?.length ?? 0} roles
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap size={13} className="text-accent" />
                      {genProfile.educations?.length ?? 0} education
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FolderGit2 size={13} className="text-accent" />
                      {genProfile.projects?.length ?? 0} projects
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Check size={13} className="text-accent" />
                      {uploadedDoc.parsed.skills.length} skills
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-md">
              <Label htmlFor="prof-title">Profile title</Label>
              <input
                id="prof-title"
                value={profileTitleInput}
                onChange={(e) => setProfileTitleInput(e.target.value)}
                className="field"
                placeholder="e.g. Maya Chen — Full-Stack Profile"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {uploadedDoc.isExactProfileMatch ? (
                <>
                  <Button
                    variant="primary"
                    onClick={handleUseExistingProfileForMatch}
                  >
                    <Target size={16} /> Use existing profile for job match
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={syncingProfile}
                    onClick={() => handleSyncToProfile(false)}
                  >
                    <UserPlus size={16} />{" "}
                    {syncingProfile
                      ? "Saving…"
                      : "Save as new profile anyway"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    disabled={syncingProfile}
                    onClick={() => handleSyncToProfile(true)}
                  >
                    <UserCheck size={16} />{" "}
                    {syncingProfile
                      ? "Syncing…"
                      : "Save to Master Profile & match a job"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={syncingProfile}
                    onClick={() => handleSyncToProfile(false)}
                  >
                    <Check size={16} /> Save to Master Profile only
                  </Button>
                </>
              )}
              <Button
                variant="quiet"
                onClick={() => {
                  setUploadedDoc(null)
                  setProfileBanner(
                    "Kept existing Master Profile unchanged. Your uploaded resume is saved below.",
                  )
                }}
              >
                Skip profile sync
              </Button>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Panel corners title="New resume" eyebrow="Input">
          <div className="space-y-5 p-5">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              className={cx(
                "relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed px-6 py-10 text-center transition-colors",
                drag
                  ? "border-accent bg-accent/10"
                  : "border-fg/25 hover:border-fg/50 hover:bg-fg/[0.03]",
              )}
            >
              {scanning && (
                <span className="scanline absolute inset-x-0 h-px bg-accent shadow-[0_0_12px_var(--accent)]" />
              )}
              <FileUp size={30} className="text-accent" strokeWidth={1.5} />
              <div className="mt-3 font-grid text-lg font-medium">
                {scanning
                  ? "Extracting layout blocks & skills…"
                  : (fileName ?? "Drop your resume here")}
              </div>
              <div className="mt-1 text-sm text-fg/50">
                PDF, DOCX or TXT · up to 5 MB
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && readFile(e.target.files[0])
                }
              />
            </div>
            {note && (
              <div className="flex gap-2 border border-fg/20 bg-fg/[0.04] p-3 text-sm text-fg/80">
                <Info size={16} className="mt-0.5 shrink-0 text-fg/60" />
                {note}
              </div>
            )}
            <div>
              <Label htmlFor="r-title">Title</Label>
              <input
                id="r-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field"
                placeholder="e.g. Backend — Spring 2025"
              />
            </div>
            <div>
              <Label
                htmlFor="r-text"
                hint={
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => {
                      setText(SAMPLE_RESUME)
                      setTitle("Sample — Maya Chen")
                      setUploadedDoc(null)
                    }}
                  >
                    Use sample
                  </button>
                }
              >
                Resume text
              </Label>
              <textarea
                id="r-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setUploadedDoc(null)
                }}
                rows={12}
                className="field scroll-thin font-mono text-[13px] leading-relaxed"
                placeholder="Paste your resume text here or drop a PDF/DOCX file above…"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                disabled={!preview || saving}
                onClick={() => save(true)}
              >
                {saving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Target size={17} />
                )}{" "}
                Save & match a job
              </Button>
              <Button
                variant="ghost"
                disabled={!preview || saving}
                onClick={() => save(false)}
              >
                Save resume
              </Button>
            </div>
          </div>
        </Panel>

        <Panel
          title={
            preview
              ? "Live parse preview"
              : viewing
                ? viewing.title
                : "Parse report"
          }
          eyebrow={preview ? "Active parse" : "Saved resume"}
        >
          <div className="p-5">
            {preview ? (
              <ParsedReport parsed={preview} />
            ) : viewing ? (
              <ParsedReport parsed={viewing.parsed} />
            ) : (
              <Empty
                icon={<FileText size={24} />}
                title="Nothing parsed yet"
                body="Drop a PDF, DOCX or TXT file or paste text — the evidence report updates automatically."
              />
            )}
          </div>
        </Panel>
      </div>

      <Panel
        className="mt-6"
        title="Your resumes"
        eyebrow={`${data.resumes.length} on file`}
      >
        {data.resumes.length === 0 ? (
          <p className="p-5 text-sm text-fg/55">No saved resumes yet.</p>
        ) : (
          <ul className="divide-y divide-fg/10">
            {data.resumes.map((r) => (
              <li
                key={r.id}
                className={cx(
                  "flex flex-wrap items-center gap-4 px-5 py-4",
                  selected === r.id && !preview && "bg-fg/[0.04]",
                )}
              >
                <FileText size={20} className="text-fg/50" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelected(r.id)}
                >
                  <div className="truncate font-grid font-medium hover:text-accent">
                    {r.title}
                  </div>
                  <div className="text-xs text-fg/50">
                    {r.source} · {r.parsed.skills.length} skills · ATS{" "}
                    {r.parsed.atsScore} · {timeAgo(r.createdAt)}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenInBuilder(r)}
                >
                  <Hammer size={14} /> Builder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/app/match?resume=${r.id}`)}
                >
                  Match
                </Button>
                <button
                  className="p-2 text-fg/40 hover:text-accent"
                  aria-label={`Delete ${r.title}`}
                  onClick={() => handleDeleteResume(r)}
                >
                  <Trash2 size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

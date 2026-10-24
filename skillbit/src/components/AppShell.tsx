import { useEffect, useRef, useState, type FormEvent } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import {
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  FileUp,
  Hammer,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Moon,
  Route,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react"
import { Button, Label, Logo, Modal, ThemeToggle, cx } from "./ui"
import { download } from "../lib/actions"
import { api, getToken } from "../lib/api"
import { emptyDraft, useApp } from "../lib/store"
import { useTheme } from "../lib/theme"

const CANDIDATE_NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/upload", label: "Resumes", icon: FileUp },
  { to: "/app/match", label: "Job match", icon: Target },
  { to: "/app/roadmaps", label: "Roadmaps", icon: Route },
  { to: "/app/builder", label: "Resume builder", icon: Hammer },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/profile", label: "Profile", icon: UserRound },
]
const ADMIN_NAV = [
  { to: "/app/admin", label: "Placement portal", icon: ShieldCheck, end: true },
  { to: "/app/profile", label: "Profile", icon: UserRound },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "01. How does SkillBit calculate my Job Fit Score?",
    a: "Your Fit Score (0–100%) is computed deterministically by weighting Required job skills at 1.0 and Preferred skills at 0.5. Each skill blends Exact/Alias match (60%) with the stronger of your Resume Evidence Tier or Hybrid Semantic Similarity (40%).",
  },
  {
    q: "02. What are the four Resume Evidence Tiers?",
    a: "Skills are graded by where and how they appear: STRONG (1.0x — in Experience/Projects with an action verb or metric), MODERATE (0.85x — in Experience/Projects without metrics), LISTED (0.60x — in the Skills section only), and MENTIONED (0.40x — in Summary or Header only).",
  },
  {
    q: "03. What do STRONG_MATCH, WEAK_EVIDENCE, PARTIAL_MATCH, and MISSING mean?",
    a: "STRONG_MATCH means the skill is proven in your experience/projects. WEAK_EVIDENCE means you listed the skill, but didn’t prove it in accomplishment bullets. PARTIAL_MATCH means you have closely related or transferable experience. MISSING means the skill is absent from your resume.",
  },
  {
    q: "04. Which resume file formats are supported for upload?",
    a: "You can upload PDF (.pdf), Microsoft Word (.docx), or plain text (.txt) files up to 5 MB, or paste your resume text directly into the parser.",
  },
  {
    q: "05. Does the STAR Bullet Optimizer invent fake metrics or experience?",
    a: "No. SkillBit enforces a strict anti-hallucination guardrail: it upgrades passive phrasing into strong action verbs and inserts [bracketed] placeholders for metrics so you remain in 100% control of your real numbers and credentials.",
  },
  {
    q: "06. How does Canonical Skill Normalization work?",
    a: "Our boundary-safe normalizer maps 370+ aliases across 12 technical categories (e.g., resolving 'k8s' to 'Kubernetes' and 'postgres' to 'PostgreSQL') while preventing false substring matches like 'Java' inside 'JavaScript'.",
  },
  {
    q: "07. How does the GitHub Repository Importer work in the Resume Builder?",
    a: "Paste any public GitHub URL (e.g., https://github.com/owner/repo) in the Builder. SkillBit fetches the repository language, topics, description, and star count, then synthesizes three ready-to-edit STAR project bullets.",
  },
  {
    q: "08. How do the 4-stage Learning Roadmaps track my progress?",
    a: "Each roadmap breaks a skill gap into four sequential stages (Foundations, Core Architecture, Production Engineering, and Capstone Proof) with 16 topic checkboxes. Checking off topics automatically updates and saves your completion percentage.",
  },
  {
    q: "09. Why does the Resume Builder use a single-column layout?",
    a: "Multi-column tables, sidebars, and floating text boxes frequently scramble reading order in enterprise Applicant Tracking Systems (ATS). A clean single-column layout with standard headings guarantees maximum machine parseability.",
  },
  {
    q: "10. Does a high Fit Score guarantee a job interview?",
    a: "No. Your Fit Score is an automated ATS alignment indicator designed to help you tailor your resume and close technical gaps; hiring decisions also depend on recruiter review, portfolio depth, and interview performance.",
  },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useApp()
  const items = user?.role === "admin" ? ADMIN_NAV : CANDIDATE_NAV
  return (
    <nav className="flex flex-col gap-1">
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              "group relative flex items-center gap-3 px-3 py-2.5 font-grid text-[15px] transition-colors",
              isActive
                ? "bg-fg/[0.08] text-fg"
                : "text-fg/60 hover:bg-fg/[0.04] hover:text-fg",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cx(
                  "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 bg-accent transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <n.icon
                size={18}
                strokeWidth={1.6}
                className={isActive ? "text-accent" : ""}
              />
              {n.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

type ActiveModal = "settings" | "preferences" | "help" | null

function UserCard({
  onNavigate,
  onOpenModal,
}: {
  onNavigate?: () => void
  onOpenModal: (m: ActiveModal) => void
}) {
  const { user, logout } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  if (!user) return null

  const menuItems = [
    {
      label: "Account",
      icon: UserRound,
      onClick: () => {
        setMenuOpen(false)
        onNavigate?.()
        navigate("/app/profile")
      },
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => {
        setMenuOpen(false)
        onNavigate?.()
        onOpenModal("settings")
      },
    },
    {
      label: "Preferences",
      icon: SlidersHorizontal,
      onClick: () => {
        setMenuOpen(false)
        onNavigate?.()
        onOpenModal("preferences")
      },
    },
    {
      label: "Help & Support",
      icon: CircleHelp,
      onClick: () => {
        setMenuOpen(false)
        onNavigate?.()
        onOpenModal("help")
      },
    },
  ]

  return (
    <div ref={menuRef} className="relative border-t border-fg/10 pt-4">
      {menuOpen && (
        <div
          role="menu"
          aria-label="User menu"
          className="rise absolute bottom-full left-0 right-0 z-50 mb-3 border border-fg/15 bg-surface shadow-[0_18px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <div className="border-b border-fg/10 px-3.5 py-2.5">
            <div className="truncate font-grid text-xs font-semibold text-fg">
              {user.name}
            </div>
            <div className="truncate text-[11px] text-fg/50">{user.email}</div>
          </div>
          <div className="py-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left font-grid text-sm text-fg/75 transition-colors hover:bg-fg/[0.06] hover:text-fg"
              >
                <item.icon size={16} className="text-accent" strokeWidth={1.7} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-fg/10 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onNavigate?.()
                logout()
                navigate("/")
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left font-grid text-sm text-accent transition-colors hover:bg-accent/10"
            >
              <LogOut size={16} strokeWidth={1.7} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center bg-accent font-grid text-canvas font-semibold">
          {user.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-fg/50">{user.email}</div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Open profile menu"
          title="More options"
          className={cx(
            "grid size-9 shrink-0 place-items-center border transition-colors",
            menuOpen
              ? "border-accent bg-accent/15 text-accent"
              : "border-transparent text-fg/60 hover:border-fg/15 hover:bg-fg/[0.04] hover:text-fg",
          )}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      {user.role === "admin" && (
        <div className="mt-3 inline-block border border-accent/40 px-2 py-0.5 font-grid text-[10px] uppercase tracking-[0.18em] text-accent">
          Admin
        </div>
      )}
    </div>
  )
}

export default function AppShell() {
  const [open, setOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const { user, data, update, logout } = useApp()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const loc = useLocation()

  // Password Reset states (in Settings modal)
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSuccess, setPwSuccess] = useState("")

  // Preferences states
  const [prefSaved, setPrefSaved] = useState(false)
  const [roadmapLevel, setRoadmapLevel] = useState(
    () => localStorage.getItem("skillbit:roadmap-level") || "Intermediate",
  )
  const [autoSyncProfile, setAutoSyncProfile] = useState(
    () => localStorage.getItem("skillbit:auto-sync-profile") !== "false",
  )

  // Help & Support FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => setOpen(false), [loc.pathname])

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault()
    setPwError("")
    setPwSuccess("")
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.")
      return
    }
    if (newPw !== confirmPw) {
      setPwError("New password and confirmation do not match.")
      return
    }

    setPwBusy(true)
    try {
      if (getToken()) {
        const res = await api.changePassword(currentPw, newPw)
        setPwSuccess(res.message || "Password updated successfully.")
      } else {
        // Update local stored user if running offline
        const raw = localStorage.getItem("skillbit:users")
        const list = raw ? (JSON.parse(raw) as any[]) : []
        const updated = list.map((u) =>
          u.email?.toLowerCase() === user?.email.toLowerCase()
            ? { ...u, password: newPw }
            : u,
        )
        localStorage.setItem("skillbit:users", JSON.stringify(updated))
        setPwSuccess("Password updated successfully.")
      }
      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
    } catch (err) {
      setPwError((err as Error).message || "Failed to update password.")
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="pointer-events-none fixed inset-0 grid-lines opacity-60" />
      <div className="pointer-events-none fixed -right-40 -top-40 size-[520px] rounded-full bg-accent/10 blur-[120px]" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-fg/10 bg-chrome/90 px-4 py-6 backdrop-blur lg:flex">
        <div className="mb-8 flex items-center justify-between gap-2 px-2">
          <Logo size={44} withWord />
          <ThemeToggle className="size-9" iconSize={16} />
        </div>
        <NavList />
        <div className="mt-auto">
          <UserCard onOpenModal={setActiveModal} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-fg/10 bg-chrome/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size={36} withWord />
        <div className="flex items-center gap-2">
          <ThemeToggle className="size-9" iconSize={16} />
          <button
            onClick={() => setOpen(true)}
            className="p-2"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/60"
            onClick={() => setOpen(false)}
          />
          <div className="rise absolute inset-y-0 left-0 flex w-72 flex-col border-r border-fg/10 bg-chrome px-4 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo size={36} withWord />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="p-1"
              >
                <X size={22} />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <UserCard
                onNavigate={() => setOpen(false)}
                onOpenModal={setActiveModal}
              />
            </div>
          </div>
        </div>
      )}

      <main className="relative lg:pl-64">
        <div
          key={loc.pathname}
          className="rise mx-auto max-w-[1400px] px-4 py-8 md:px-8 md:py-10"
        >
          <Outlet />
        </div>
      </main>

      {/* Settings Modal */}
      <Modal
        open={activeModal === "settings"}
        onClose={() => {
          setActiveModal(null)
          setPwError("")
          setPwSuccess("")
        }}
        title="Settings"
      >
        <div className="space-y-5">
          <div className="border border-fg/12 bg-fg/[0.02] p-4">
            <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-accent">
              Account identity
            </div>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-fg/50">Name: </span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div>
                <span className="text-fg/50">Email: </span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div>
                <span className="text-fg/50">Role: </span>
                <span className="font-grid text-xs uppercase">{user?.role}</span>
              </div>
              <div>
                <span className="text-fg/50">Auth provider: </span>
                <span className="font-grid text-xs uppercase">
                  {user?.provider}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActiveModal(null)
                  navigate("/app/profile")
                }}
              >
                <UserRound size={14} /> Manage full profile
              </Button>
            </div>
          </div>

          {/* Password Reset Section */}
          <form
            onSubmit={handlePasswordReset}
            className="space-y-4 border border-fg/12 bg-fg/[0.02] p-4"
          >
            <div className="flex items-center gap-2 font-grid text-[11px] uppercase tracking-[0.18em] text-accent">
              <KeyRound size={14} /> Password reset
            </div>
            <p className="text-xs text-fg/60">
              Update your account password. Use at least 8 characters.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="pw-cur">Current password</Label>
                <input
                  id="pw-cur"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  className="field py-2 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="pw-new">New password</Label>
                <input
                  id="pw-new"
                  type="password"
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 chars"
                  className="field py-2 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="pw-conf">Confirm password</Label>
                <input
                  id="pw-conf"
                  type="password"
                  required
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new"
                  className="field py-2 text-sm"
                />
              </div>
            </div>
            {pwError && (
              <div className="flex items-center gap-2 border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
                <TriangleAlert size={14} />
                <span>{pwError}</span>
              </div>
            )}
            {pwSuccess && (
              <div className="flex items-center gap-2 border border-fg/25 bg-fg/[0.05] px-3 py-2 text-xs text-fg">
                <Check size={14} className="text-accent" />
                <span>{pwSuccess}</span>
              </div>
            )}
            <div>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={pwBusy}
              >
                <KeyRound size={14} />{" "}
                {pwBusy ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>

          <div className="border border-fg/12 bg-fg/[0.02] p-4">
            <div className="font-grid text-[11px] uppercase tracking-[0.18em] text-fg/55">
              Workspace data & privacy
            </div>
            <p className="mt-1 text-xs text-fg/60">
              Export your complete resume, match analysis, and roadmap workspace
              as JSON, or reset your local workspace.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  download(
                    "skillbit-export.json",
                    JSON.stringify({ user, ...data }, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={14} /> Export JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="hover:border-accent hover:text-accent"
                onClick={() => {
                  if (
                    !user ||
                    !confirm(
                      "Clear all resumes, analyses, and roadmaps from your workspace?",
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
                  setActiveModal(null)
                }}
              >
                <Trash2 size={14} /> Clear workspace
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  setActiveModal(null)
                  logout()
                  navigate("/")
                }}
              >
                <LogOut size={14} /> Log out
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Preferences Modal */}
      <Modal
        open={activeModal === "preferences"}
        onClose={() => setActiveModal(null)}
        title="Preferences"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between border border-fg/12 bg-fg/[0.02] p-4">
            <div>
              <div className="font-grid text-sm font-medium">
                Appearance theme
              </div>
              <div className="text-xs text-fg/55">
                Current mode:{" "}
                <span className="font-grid uppercase text-fg">{theme}</span>{" "}
                (Ink #11151C / Bone #F4F1EA)
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={toggle}>
              {theme === "dark" ? (
                <>
                  <Sun size={15} /> Switch to Light
                </>
              ) : (
                <>
                  <Moon size={15} /> Switch to Dark
                </>
              )}
            </Button>
          </div>

          {data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pref-role">Default target role</Label>
                  <input
                    id="pref-role"
                    value={data.profile.targetRole}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        profile: { ...d.profile, targetRole: e.target.value },
                      }))
                    }
                    placeholder="e.g. Senior Full-Stack Engineer"
                    className="field"
                  />
                </div>
                <div>
                  <Label htmlFor="pref-level">
                    Roadmap experience level
                  </Label>
                  <select
                    id="pref-level"
                    value={roadmapLevel}
                    onChange={(e) => {
                      setRoadmapLevel(e.target.value)
                      localStorage.setItem(
                        "skillbit:roadmap-level",
                        e.target.value,
                      )
                    }}
                    className="field"
                  >
                    <option value="Beginner">Entry-level / Beginner</option>
                    <option value="Intermediate">
                      Intermediate / Mid-level
                    </option>
                    <option value="Advanced">Senior / Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pref-font">Default builder font</Label>
                  <select
                    id="pref-font"
                    value={data.draft.styleSettings?.font_family || "sans"}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        draft: {
                          ...d.draft,
                          styleSettings: {
                            ...(d.draft.styleSettings ?? {
                              font_family: "sans",
                              font_size: "standard",
                              line_spacing: "normal",
                              accent_color: "#1E3A8A",
                            }),
                            font_family: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="field"
                  >
                    <option value="sans">Sans-Serif (Helvetica)</option>
                    <option value="serif">Executive Serif (Times)</option>
                    <option value="mono">Technical Mono (Courier)</option>
                    <option value="calibri">Corporate Sans (Calibri)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="pref-skills-mode">
                    Default skills display
                  </Label>
                  <select
                    id="pref-skills-mode"
                    value={data.draft.skillsDisplayMode || "rows"}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        draft: {
                          ...d.draft,
                          skillsDisplayMode: e.target.value as "rows" | "table",
                        },
                      }))
                    }
                    className="field"
                  >
                    <option value="rows">Inline domain rows</option>
                    <option value="table">Bordered table grid</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="pref-size">Default PDF font size</Label>
                  <select
                    id="pref-size"
                    value={data.draft.styleSettings?.font_size || "standard"}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        draft: {
                          ...d.draft,
                          styleSettings: {
                            ...(d.draft.styleSettings ?? {
                              font_family: "sans",
                              font_size: "standard",
                              line_spacing: "normal",
                              accent_color: "#1E3A8A",
                            }),
                            font_size: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="field"
                  >
                    <option value="compact">Compact (10pt)</option>
                    <option value="standard">Standard (11pt)</option>
                    <option value="comfortable">Large (12pt)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="pref-spacing">Default line spacing</Label>
                  <select
                    id="pref-spacing"
                    value={data.draft.styleSettings?.line_spacing || "normal"}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        draft: {
                          ...d.draft,
                          styleSettings: {
                            ...(d.draft.styleSettings ?? {
                              font_family: "sans",
                              font_size: "standard",
                              line_spacing: "normal",
                              accent_color: "#1E3A8A",
                            }),
                            line_spacing: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="field"
                  >
                    <option value="tight">Tight (1-page density)</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Relaxed</option>
                  </select>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 border border-fg/12 bg-fg/[0.02] p-4 text-sm text-fg/80">
                <input
                  type="checkbox"
                  checked={autoSyncProfile}
                  onChange={(e) => {
                    setAutoSyncProfile(e.target.checked)
                    localStorage.setItem(
                      "skillbit:auto-sync-profile",
                      String(e.target.checked),
                    )
                  }}
                  className="mt-0.5 size-4 accent-accent"
                />
                <div>
                  <div className="font-grid text-xs font-medium uppercase tracking-[0.14em] text-fg">
                    Prompt Master Profile sync on resume upload
                  </div>
                  <div className="mt-1 text-xs text-fg/55">
                    Automatically extract and offer to sync contact info,
                    experience, education, and skills when a new resume is
                    uploaded.
                  </div>
                </div>
              </label>

              <div className="flex justify-end gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPrefSaved(true)
                    setTimeout(() => {
                      setPrefSaved(false)
                      setActiveModal(null)
                    }, 900)
                  }}
                >
                  {prefSaved ? (
                    <>
                      <Check size={15} /> Saved
                    </>
                  ) : (
                    "Save preferences"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        open={activeModal === "help"}
        onClose={() => setActiveModal(null)}
        title="Help & Support"
        width="max-w-3xl"
      >
        <div className="space-y-5 text-sm">
          <div className="border border-fg/12 bg-fg/[0.02] p-4">
            <div className="font-grid text-xs uppercase tracking-[0.18em] text-accent">
              Quick workflow guide
            </div>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-fg/75">
              <li>
                <b>01. Upload & Parse:</b> Drop a PDF, DOCX, or TXT resume in{" "}
                <span className="font-grid text-fg">Resumes</span> to trace
                skills across 4 evidence tiers (STRONG, MODERATE, LISTED,
                MENTIONED).
              </li>
              <li>
                <b>02. Job Match:</b> Paste a target job description in{" "}
                <span className="font-grid text-fg">Job match</span> to compute
                your deterministic Fit Score and 4-tier skill gap breakdown.
              </li>
              <li>
                <b>03. Learning Roadmaps:</b> Open{" "}
                <span className="font-grid text-fg">Roadmaps</span> to follow a
                4-stage sequential learning tree and track topic mastery.
              </li>
              <li>
                <b>04. ATS Resume Builder:</b> Use{" "}
                <span className="font-grid text-fg">Resume builder</span> to
                refine bullets with the STAR AI optimizer, import GitHub repos,
                and export a single-column ReportLab ATS PDF.
              </li>
            </ol>
          </div>

          <div>
            <div className="mb-3 font-grid text-xs uppercase tracking-[0.18em] text-accent">
              Frequently asked questions (10)
            </div>
            <div className="divide-y divide-fg/10 border border-fg/12 bg-fg/[0.02]">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-grid text-xs font-medium text-fg transition-colors hover:bg-fg/[0.04]"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={15}
                        className={cx(
                          "shrink-0 text-accent transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-fg/10 bg-surface/50 px-4 py-3 text-xs leading-relaxed text-fg/75">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

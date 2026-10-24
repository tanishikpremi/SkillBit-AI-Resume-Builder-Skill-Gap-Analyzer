import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  FileUp,
  FolderGit2,
  GraduationCap,
  Hammer,
  Menu,
  Route,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react"
import {
  ArrowMark,
  Backdrop,
  Bar,
  Bracketed,
  ButtonLink,
  Eyebrow,
  HERO_SRC,
  LogoMark,
  ScoreGauge,
  StatusBadge,
  ThemeToggle,
  cx,
} from "../components/ui"
import { SiteFooter } from "../components/SiteFooter"
import { normalizeSkills } from "../lib/engine"
import { useApp } from "../lib/store"
import { BASE_TAXONOMY, aliasCount } from "../lib/taxonomy"

/* ------------------------------------------------------------------ */
/* Hero — implemented from Figma node 1:3 (1920×1080 frame)            */
/* Sizes use clamp(min, vw, max) so the 1920px viewport matches 1:1.   */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string
  href: string
  route?: boolean
}

function Hero() {
  const { user } = useApp()
  const [open, setOpen] = useState(false)
  const navItems: NavItem[] = [
    { label: "HOW IT WORKS?", href: "#how" },
    { label: "FEATURES", href: "#features" },
    { label: "ABOUT", href: "#about" },
    user
      ? { label: "DASHBOARD", href: "/app", route: true }
      : { label: "LOGIN/SIGNUP", href: "/login", route: true },
  ]

  return (
    <section className="grain relative isolate flex h-dvh min-h-[540px] flex-col justify-between overflow-hidden bg-canvas">
      {/* A rising staircase: the next step, with open wall space for the copy. */}
      <Backdrop position="65% 70%" />

      <header className="relative z-20 flex shrink-0 items-center justify-between px-6 pt-4 md:pl-[clamp(24px,3.385vw,60px)] md:pr-[clamp(24px,5vw,88px)] md:pt-[clamp(14px,2.2vh,32px)]">
        <Link
          to="/"
          aria-label="SkillBit home"
          className="block size-[clamp(48px,7.5vh,84px)] shrink-0"
        >
          <LogoMark className="size-full" label="SkillBit" />
        </Link>
        <nav className="hidden items-center gap-[clamp(24px,3.6vw,64px)] font-machina text-[clamp(14px,1.15vw,20px)] leading-normal whitespace-nowrap text-fg md:flex">
          {navItems.map((n) =>
            n.route ? (
              <Link
                key={n.label}
                to={n.href}
                className="relative transition-colors hover:text-accent"
              >
                {n.label}
              </Link>
            ) : (
              <a
                key={n.label}
                href={n.href}
                className="relative transition-colors hover:text-accent"
              >
                {n.label}
              </a>
            ),
          )}
          <ThemeToggle
            className="size-[clamp(36px,4.5vh,42px)] border-fg/40"
            iconSize={18}
          />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle className="border-fg/40" />
          <button
            className="p-2"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-canvas/95 p-6 backdrop-blur md:hidden">
          <div className="flex justify-end">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="p-2"
            >
              <X size={28} />
            </button>
          </div>
          <nav className="mt-10 flex flex-col gap-8 font-machina text-3xl">
            {navItems.map((n) =>
              n.route ? (
                <Link key={n.label} to={n.href} onClick={() => setOpen(false)}>
                  {n.label}
                </Link>
              ) : (
                <a key={n.label} href={n.href} onClick={() => setOpen(false)}>
                  {n.label}
                </a>
              ),
            )}
          </nav>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col items-start justify-center px-6 pb-8 pt-4 md:pl-[5.52vw] md:pr-[5.6vw] md:pb-[clamp(24px,5vh,56px)] md:pt-0">
        {/* Tag with four red squares (nodes 9:28, 9:44, 9:43, 9:45) */}
        <div className="relative inline-flex items-center px-[clamp(18px,1.5vw,28px)] py-[clamp(8px,1.1vh,14px)]">
          {[
            "left-0 top-0",
            "right-0 top-0",
            "left-0 bottom-0",
            "right-0 bottom-0",
          ].map((p) => (
            <span
              key={p}
              className={cx(
                "absolute size-[clamp(8px,0.9vw,14px)] bg-accent",
                p,
              )}
            />
          ))}
          <p className="font-grid font-medium text-[clamp(11px,min(1.1vw,2vh),18px)] leading-normal whitespace-nowrap text-fg">
            AI-POWERED CAREER INTELLIGENCE
          </p>
        </div>

        <h1 className="mt-[clamp(12px,2vh,22px)] font-grid font-semibold text-[clamp(32px,min(4.2vw,7.5vh),72px)] leading-[1.06] text-fg">
          <span className="block">Your next opportunity</span>
          <span className="block text-accent">starts with you.</span>
        </h1>

        <p className="mt-[clamp(10px,1.6vh,18px)] max-w-[clamp(280px,42vw,720px)] font-machina text-[clamp(15px,min(1.45vw,2.6vh),24px)] leading-[1.3] tracking-[0.03em] text-fg/90">
          Build an ATS-ready resume, discover how well you match your dream job,
          and turn skill gaps into a clear learning path.
        </p>

        <div className="mt-[clamp(18px,3.2vh,36px)] flex items-center gap-[clamp(12px,0.8vw,16px)] pl-[clamp(0px,0.3vw,6px)]">
          <ArrowMark className="w-[clamp(24px,2vw,38px)] -scale-x-100" />
          <ButtonLink to={user ? "/app/upload" : "/signup"} size="hero">
            Analyze my resume
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Section({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cx(
        "relative scroll-mt-6 px-6 py-24 md:px-[5.5vw] md:py-32",
        className,
      )}
    >
      <div className="mx-auto max-w-[1600px]">{children}</div>
    </section>
  )
}

function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string
  title: ReactNode
  desc?: string
}) {
  return (
    <div className="mb-14 grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-end">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-5 font-grid text-[clamp(34px,3.6vw,68px)] font-semibold leading-[1.02]">
          {title}
        </h2>
      </div>
      {desc && (
        <p className="font-machina text-lg leading-relaxed tracking-[0.02em] text-fg/65 md:text-xl">
          {desc}
        </p>
      )}
    </div>
  )
}

function Metrics() {
  const items = [
    [`${BASE_TAXONOMY.length}+`, "Canonical skills"],
    [`${aliasCount(BASE_TAXONOMY)}+`, "Normalized aliases"],
    ["4", "Evidence tiers"],
    ["5", "LLM providers with failover"],
  ]
  return (
    <div className="border-y border-fg/10 bg-band">
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 md:grid-cols-4 md:px-[5.5vw]">
        {items.map(([n, l], i) => (
          <div
            key={l}
            className={cx(
              "px-6 py-10 md:py-12",
              i > 0 && "md:border-l",
              i % 2 === 1 && "border-l",
              i > 1 && "border-t md:border-t-0",
              "border-fg/10",
            )}
          >
            <div className="font-grid text-[clamp(36px,3.4vw,64px)] font-semibold leading-none">
              {n}
            </div>
            <div className="mt-3 flex items-center gap-2 font-machina text-sm uppercase tracking-[0.14em] text-fg/60">
              <span className="size-1.5 bg-accent" />
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HowItWorks() {
  const steps = [
    {
      icon: FileUp,
      t: "Upload",
      d: "Drop a PDF, DOCX or TXT. A layout-aware parser classifies six sections and traces every skill to its evidence.",
    },
    {
      icon: Target,
      t: "Match",
      d: "Paste a job description. Required vs preferred skills are weighted and scored with an explainable formula.",
    },
    {
      icon: Route,
      t: "Bridge",
      d: "Every gap becomes a 4-stage roadmap with checklists, docs and a capstone project that proves competence.",
    },
    {
      icon: Hammer,
      t: "Build",
      d: "Rewrite weak bullets with the STAR optimizer, import GitHub repos and export a single-column ATS PDF.",
    },
  ]
  return (
    <Section id="how" className="grid-lines bg-band">
      <SectionTitle
        eyebrow="How it works?"
        title={
          <>
            From resume to roadmap
            <br />
            <span className="text-accent">in four moves.</span>
          </>
        }
        desc="No black boxes. Each step shows you exactly what was detected, why it was scored that way, and what to do next."
      />
      <div className="grid gap-px bg-fg/10 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <div
            key={s.t}
            className="group relative bg-band p-8 transition-colors hover:bg-surface md:p-10"
          >
            <div className="flex items-start justify-between">
              <span className="font-grid text-[64px] font-semibold leading-none text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--color-fg)_35%,transparent)] group-hover:[-webkit-text-stroke:1px_var(--accent)]">
                0{i + 1}
              </span>
              <s.icon className="text-accent" size={28} strokeWidth={1.5} />
            </div>
            <h3 className="mt-10 font-grid text-3xl font-semibold">{s.t}</h3>
            <p className="mt-3 leading-relaxed text-fg/65">{s.d}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

function LiveGauge() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const vals = [82, 64, 47, 91, 73]
    let i = 0
    setV(vals[0])
    const t = setInterval(() => setV(vals[++i % vals.length]), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row">
      <ScoreGauge value={v} size={200} />
      <div className="w-full flex-1 space-y-4">
        {[
          ["Exact match", Math.min(100, v + 9), "bg-fg"],
          ["Experience evidence", Math.max(10, v - 6), "bg-accent"],
          ["Semantic resonance", Math.max(10, v - 14), "bg-fg/35"],
        ].map(([l, n, tone]) => (
          <div key={l as string}>
            <div className="mb-1.5 flex justify-between font-grid text-[12px] uppercase tracking-[0.14em] text-fg/60">
              <span>{l}</span>
              <span>{n}%</span>
            </div>
            <Bar value={n as number} tone={tone as string} />
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  children,
  className,
  eyebrow,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  className?: string
  eyebrow?: string
}) {
  return (
    <div
      className={cx(
        "relative flex flex-col border border-fg/12 bg-surface/80 p-7 md:p-8",
        className,
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <span className="grid size-11 place-items-center border border-fg/20 text-accent">
          {icon}
        </span>
        {eyebrow && (
          <span className="font-grid text-[11px] uppercase tracking-[0.2em] text-fg/45">
            {eyebrow}
          </span>
        )}
      </div>
      <h3 className="font-grid text-2xl font-semibold leading-tight">
        {title}
      </h3>
      <div className="mt-4 flex-1 text-fg/65">{children}</div>
    </div>
  )
}

function Features() {
  return (
    <Section id="features" className="bg-band-deep">
      <SectionTitle
        eyebrow="Features"
        title={
          <>
            Career intelligence,
            <br />
            <span className="text-accent">explained line by line.</span>
          </>
        }
        desc="Deterministic NLP separates truth from generative creativity, so every score is reproducible and every suggestion is yours to accept, edit or reject."
      />
      <div className="grid gap-5 lg:grid-cols-6">
        <Bracketed size={9} className="p-1 lg:col-span-4">
          <FeatureCard
            icon={<Target size={20} />}
            title="Explainable fit score"
            eyebrow="Matcher"
            className="h-full"
          >
            <p className="mb-8 max-w-xl">
              Overall fit is broken into exact match, experience evidence and
              semantic resonance — weighted 1.0 for required skills and 0.5 for
              preferred.
            </p>
            <LiveGauge />
          </FeatureCard>
        </Bracketed>
        <FeatureCard
          icon={<ScanSearch size={20} />}
          title="4-tier gap classifier"
          eyebrow="Gaps"
          className="lg:col-span-2"
        >
          <p>
            Each requirement lands in one of four states, ranked by priority
            with snippet proof.
          </p>
          <div className="mt-6 space-y-3">
            {([
              ["STRONG_MATCH", 'React — "Architected a dashboard…"'],
              ["WEAK_EVIDENCE", "Kubernetes — listed only"],
              ["PARTIAL_MATCH", "Terraform ← CloudFormation"],
              ["MISSING", "Apache Kafka"],
            ] as const).map(([st, ex]) => (
              <div
                key={st}
                className="flex flex-col gap-1.5 border-b border-fg/10 pb-3 last:border-0"
              >
                <StatusBadge status={st} />
                <span className="text-sm text-fg/55">{ex}</span>
              </div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard
          icon={<ShieldCheck size={20} />}
          title="Evidence tracer"
          eyebrow="Parser"
          className="lg:col-span-2"
        >
          <p>
            A skill backed by action verbs and metrics outweighs one buried in a
            footer.
          </p>
          <div className="mt-6 space-y-3">
            {[
              ["STRONG", 100],
              ["MODERATE", 85],
              ["LISTED", 60],
              ["MENTIONED", 40],
            ].map(([l, n]) => (
              <div
                key={l}
                className="grid grid-cols-[92px_1fr_40px] items-center gap-3 font-grid text-[12px] tracking-[0.1em]"
              >
                <span className="text-fg/70">{l}</span>
                <Bar value={n as number} />
                <span className="text-right text-fg/50">
                  {n as number / 100}x
                </span>
              </div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard
          icon={<Route size={20} />}
          title="Roadmap trees"
          eyebrow="Learn"
          className="lg:col-span-2"
        >
          <p>
            Four sequential stages per gap, with checklists that remember your
            progress.
          </p>
          <div className="relative mt-6 space-y-3 pl-6">
            <span className="absolute bottom-2 left-[5px] top-2 w-px bg-fg/20" />
            {[
              "Foundations & syntax",
              "Architecture & patterns",
              "Production engineering",
              "Capstone portfolio proof",
            ].map((t, i) => (
              <div key={t} className="relative flex items-center gap-3 text-sm">
                <span
                  className={cx(
                    "absolute -left-6 size-[11px] border",
                    i < 2
                      ? "border-accent bg-accent"
                      : "border-fg/40 bg-surface",
                  )}
                />
                <span className="font-grid text-fg/40">0{i + 1}</span>
                <span className={i < 2 ? "text-fg" : "text-fg/60"}>{t}</span>
              </div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard
          icon={<Sparkles size={20} />}
          title="STAR bullet optimizer"
          eyebrow="Human-in-the-loop"
          className="lg:col-span-2"
        >
          <div className="mt-1 space-y-3 text-sm">
            <div className="border border-fg/10 p-3 text-fg/50 line-through decoration-accent">
              Worked on caching layer with Redis.
            </div>
            <div className="border border-accent/40 bg-accent/10 p-3 text-fg">
              Engineered a Redis caching layer, improving [metric] by [X]%.
            </div>
            <p className="text-fg/50">
              Never invents companies, degrees or numbers — placeholders stay
              yours to fill.
            </p>
          </div>
        </FeatureCard>

        <FeatureCard
          icon={<FolderGit2 size={20} />}
          title="ATS builder + GitHub importer"
          eyebrow="Build"
          className="lg:col-span-2"
        >
          <p>
            Live split-screen editor with a single-column preview. Paste a
            public repo URL to pull stars, language and topics, then draft three
            accomplishment bullets.
          </p>
        </FeatureCard>

        <FeatureCard
          icon={<Cpu size={20} />}
          title="Multi-LLM failover"
          eyebrow="Resilience"
          className="lg:col-span-2"
        >
          <div className="mt-1 flex flex-wrap items-center gap-2 font-grid text-[13px]">
            {["Groq", "Gemini", "Grok", "OpenAI", "Local engine"].map(
              (p, i, arr) => (
                <span key={p} className="flex items-center gap-2">
                  <span
                    className={cx(
                      "border px-2.5 py-1",
                      i === arr.length - 1
                        ? "border-accent text-accent"
                        : "border-fg/20",
                    )}
                  >
                    {p}
                  </span>
                  {i < arr.length - 1 && (
                    <ArrowRight size={14} className="text-fg/40" />
                  )}
                </span>
              ),
            )}
          </div>
          <p className="mt-4">
            Zero-downtime orchestration with schema-validated JSON and an
            offline fallback.
          </p>
        </FeatureCard>
      </div>
    </Section>
  )
}

function Normalizer() {
  const { taxonomy } = useApp()
  const [input, setInput] = useState(
    "reactjs, k8s, postgres, Node, golang, pytorch, Kuberntes, tailwind",
  )
  const out = useMemo(() => normalizeSkills(input, taxonomy), [input, taxonomy])
  const tone = {
    EXACT: "text-fg border-fg/50",
    ALIAS: "text-fg/80 border-fg/30",
    FUZZY: "text-fg/60 border-fg/25",
    UNKNOWN: "text-fg/40 border-fg/20",
  }
  return (
    <Section className="bg-band">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <Eyebrow>Canonical normalizer</Eyebrow>
          <h2 className="mt-5 font-grid text-[clamp(32px,3vw,56px)] font-semibold leading-[1.04]">
            k8s is Kubernetes.
            <br />
            <span className="text-accent">Java is not JavaScript.</span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-fg/65">
            Boundary-safe matching resolves {aliasCount(BASE_TAXONOMY)}+ aliases
            across 12 categories. Type anything below — the same engine powers
            your resume analysis.
          </p>
        </div>
        <Bracketed size={9} className="p-1">
          <div className="border border-fg/12 bg-band-deep p-6 md:p-8">
            <label
              htmlFor="norm"
              className="font-grid text-[12px] uppercase tracking-[0.18em] text-fg/60"
            >
              Raw skills, comma separated
            </label>
            <textarea
              id="norm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              className="field mt-3 resize-none font-machina"
            />
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {out.map((n, i) => (
                <div
                  key={`${n.raw}-${i}`}
                  className="flex items-center justify-between gap-3 border border-fg/10 bg-fg/[0.03] px-3 py-2.5"
                >
                  <span className="truncate text-sm text-fg/60">{n.raw}</span>
                  <span className="flex items-center gap-2">
                    <span className="truncate font-grid text-sm font-medium">
                      {n.canonical ?? "—"}
                    </span>
                    <span
                      className={cx(
                        "border px-1.5 py-px font-grid text-[10px] tracking-[0.12em]",
                        tone[n.method],
                      )}
                    >
                      {n.method}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Bracketed>
      </div>
    </Section>
  )
}

function About() {
  return (
    <Section id="about" className="bg-band-deep">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="relative isolate min-h-[420px] overflow-hidden border border-fg/12 bg-canvas">
          <img
            src={HERO_SRC}
            alt=""
            aria-hidden
            className="photo-tone absolute inset-0 size-full object-cover object-[72%_70%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-band-deep via-band-deep/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 border-t border-fg/15 bg-band-deep/70 backdrop-blur-md">
            {[
              ["31", "REST endpoints"],
              ["13", "Data models"],
              ["100%", "Reproducible"],
            ].map(([n, l], i) => (
              <div
                key={l}
                className={cx("p-5", i > 0 && "border-l border-fg/15")}
              >
                <div className="font-grid text-3xl font-semibold">{n}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-fg/55">
                  {l}
                </div>
              </div>
            ))}
          </div>
          <span className="absolute left-4 top-4 size-3 bg-accent" />
          <span className="absolute right-4 top-4 size-3 bg-accent" />
        </div>
        <div className="flex flex-col justify-center">
          <Eyebrow>About</Eyebrow>
          <h2 className="mt-5 font-grid text-[clamp(34px,3.4vw,62px)] font-semibold leading-[1.03]">
            75% of qualified candidates never reach a human.
            <span className="text-accent"> We built the map out.</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-fg/65">
            SkillBit bridges candidate resumes and modern applicant tracking
            systems with deterministic heuristics, canonical skill normalization
            and hybrid semantic matching — then hands you a clear learning path
            instead of a mystery score.
          </p>
          <div className="mt-10 grid gap-px bg-fg/10 sm:grid-cols-3">
            {[
              {
                i: Target,
                t: "Job seekers",
                d: "Know exactly why you match — or don’t.",
              },
              {
                i: Sparkles,
                t: "Engineers",
                d: "Turn GitHub work into STAR proof.",
              },
              {
                i: GraduationCap,
                t: "Placement teams",
                d: "Cohort-wide gap telemetry.",
              },
            ].map(({ i: I, t, d }) => (
              <div key={t} className="bg-band-deep p-5">
                <I size={22} className="text-accent" strokeWidth={1.5} />
                <div className="mt-4 font-grid text-lg font-semibold">{t}</div>
                <div className="mt-1 text-sm text-fg/55">{d}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 border-l-2 border-accent pl-4 text-sm italic text-fg/50">
            “This score is an automated ATS alignment indicator and does not
            guarantee employment or interview selection.”
          </p>
        </div>
      </div>
    </Section>
  )
}

function FinalCta() {
  const { user } = useApp()
  return (
    <section className="theme-dark grain relative isolate overflow-hidden bg-canvas px-6 py-28 md:px-[5.5vw] md:py-36">
      <Backdrop position="70% 75%" />
      <div className="mx-auto flex max-w-[1600px] flex-col items-start gap-10 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-4xl font-grid text-[clamp(38px,4.4vw,84px)] font-semibold leading-[1.02]">
          Stop guessing what the ATS wants.
          <span className="block text-accent">
            Start proving what you know.
          </span>
        </h2>
        <div className="flex flex-wrap gap-3">
          <ButtonLink
            to={user ? "/app" : "/signup"}
            variant="primary"
            size="lg"
          >
            {user ? "Open dashboard" : "Create free account"}{" "}
            <ArrowUpRight size={20} />
          </ButtonLink>
          {!user && (
            <ButtonLink
              to="/login"
              variant="ghost"
              size="lg"
              className="bg-canvas/40 backdrop-blur"
            >
              <Users size={18} /> Log in
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <main className="bg-canvas">
      <Hero />
      <Metrics />
      <HowItWorks />
      <Features />
      <Normalizer />
      <About />
      <FinalCta />
      <SiteFooter />
    </main>
  )
}

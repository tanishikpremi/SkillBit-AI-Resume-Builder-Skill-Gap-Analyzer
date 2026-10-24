import {
  useEffect,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Link } from "react-router"
import { Moon, Sun, X } from "lucide-react"
import { useTheme } from "../lib/theme"
import type { Evidence, GapStatus, Priority } from "../lib/engine"

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ")

export const LOGO_SRC = "/assets/da6f3.png"
/** Concrete staircase by Rubén García on Unsplash — "your next step". */
export const HERO_SRC = "/assets/hero-stairs.jpg"
export const ARROW_SRC = "/assets/6cf73.svg"

/** Renders a single-colour asset as a mask so it takes the current palette colour. */
export const maskStyle = (src: string): CSSProperties => ({
  maskImage: `url(${src})`,
  WebkitMaskImage: `url(${src})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
})

export function LogoMark({
  className,
  label,
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("block shrink-0 bg-current", className)}
      style={maskStyle(LOGO_SRC)}
    />
  )
}

/** The hero's curved arrow, tinted with the accent colour. */
export function ArrowMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("block aspect-[49/45] bg-accent", className)}
      style={maskStyle(ARROW_SRC)}
    />
  )
}

/** Full-bleed staircase photograph toned into the palette. */
export function Backdrop({
  position = "center",
  className,
}: {
  position?: string
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cx(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-canvas",
        className,
      )}
    >
      <img
        src={HERO_SRC}
        alt=""
        className="photo-tone size-full object-cover"
        style={{ objectPosition: position }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-canvas/90 via-canvas/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-canvas/70 to-transparent" />
    </div>
  )
}

export function Logo({
  size = 40,
  to = "/",
  withWord = false,
}: {
  size?: number
  to?: string
  withWord?: boolean
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 shrink-0"
      aria-label="SkillBit home"
    >
      <span style={{ width: size, height: size }} className="grid shrink-0">
        <LogoMark className="size-full text-fg" label="SkillBit" />
      </span>
      {withWord && (
        <span className="font-grid text-xl font-semibold tracking-wide">
          SkillBit
        </span>
      )}
    </Link>
  )
}

/** Four red squares framing content — the hero's signature bracket motif. */
export function Bracketed({
  children,
  size = 10,
  className,
  tone = "bg-accent",
}: {
  children: ReactNode
  size?: number
  className?: string
  tone?: string
}) {
  const sq = cx("absolute", tone)
  const st = { width: size, height: size }
  return (
    <div className={cx("relative", className)}>
      <span className={cx(sq, "left-0 top-0")} style={st} />
      <span className={cx(sq, "right-0 top-0")} style={st} />
      <span className={cx(sq, "left-0 bottom-0")} style={st} />
      <span className={cx(sq, "right-0 bottom-0")} style={st} />
      {children}
    </div>
  )
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 font-grid font-medium text-[13px] uppercase tracking-[0.18em] text-fg/70",
        className,
      )}
    >
      <span className="size-2 bg-accent" />
      {children}
    </div>
  )
}

type BtnVariant = "primary" | "ghost" | "white" | "quiet"
type BtnSize = "sm" | "md" | "lg" | "hero"

/*
 * Primary keeps the Figma "Analyze my resume" CTA geometry — square corners,
 * Dx Neuegrid Medium label, 16px inset — rendered as a frosted cyan glass pane
 * (`.btn-glass` in index.css). Every variant reserves a 1px border so mixed
 * button rows line up.
 */
const BTN: Record<BtnVariant, string> = {
  primary: "btn-glass",
  ghost:
    "border-fg/25 text-fg transition-colors hover:border-fg/60 hover:bg-fg/5",
  white:
    "border-transparent bg-fg text-canvas transition-colors hover:bg-fg/85",
  quiet:
    "border-transparent text-fg/70 transition-colors hover:bg-fg/5 hover:text-fg",
}
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
  lg: "min-h-14 px-4 text-xl",
  // Sized to fit comfortably within a single 100dvh hero screen.
  hero: "px-[clamp(16px,1.4vw,24px)] py-[clamp(10px,1.4vh,14px)] text-[clamp(15px,min(1.3vw,2.4vh),22px)] leading-tight",
}
const btnClass = (variant: BtnVariant, size: BtnSize, className?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap border font-grid font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40",
    BTN_SIZE[size],
    BTN[variant],
    className,
  )

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  size?: BtnSize
}) {
  return (
    <button {...rest} className={btnClass(variant, size, className)}>
      {children}
    </button>
  )
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  to: string
  variant?: BtnVariant
  size?: BtnSize
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={btnClass(variant, size, className)}>
      {children}
    </Link>
  )
}

export function ThemeToggle({
  className,
  iconSize = 18,
}: {
  className?: string
  iconSize?: number
}) {
  const { theme, toggle } = useTheme()
  const next = theme === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cx(
        "grid size-10 shrink-0 cursor-pointer place-items-center border border-fg/20 text-fg/75 transition-colors hover:border-fg/50 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      {theme === "dark" ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  )
}

export function Panel({
  children,
  className,
  corners = false,
  title,
  action,
  eyebrow,
}: {
  children: ReactNode
  className?: string
  corners?: boolean
  title?: ReactNode
  action?: ReactNode
  eyebrow?: string
}) {
  const body = (
    <div
      className={cx(
        "relative border border-fg/12 bg-surface/70 backdrop-blur-sm",
        className,
      )}
    >
      {(title || action || eyebrow) && (
        <div className="flex items-center justify-between gap-4 border-b border-fg/10 px-5 py-4">
          <div>
            {eyebrow && (
              <div className="mb-1 font-grid text-[11px] uppercase tracking-[0.2em] text-accent">
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 className="font-grid text-lg font-semibold leading-tight">
                {title}
              </h3>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
  if (!corners) return body
  return (
    <Bracketed size={7} className="p-[3px]">
      {body}
    </Bracketed>
  )
}

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode
  htmlFor?: string
  hint?: ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-baseline justify-between font-grid text-[12px] uppercase tracking-[0.16em] text-fg/60"
    >
      <span>{children}</span>
      {hint && (
        <span className="normal-case tracking-normal text-fg/40">{hint}</span>
      )}
    </label>
  )
}

export function Bar({
  value,
  tone = "bg-accent",
  className,
}: {
  value: number
  tone?: string
  className?: string
}) {
  return (
    <div className={cx("h-1.5 w-full bg-fg/10", className)}>
      <div
        className={cx("h-full transition-[width] duration-700", tone)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function ScoreGauge({
  value,
  size = 180,
  label = "Fit score",
}: {
  value: number
  size?: number
  label?: string
}) {
  const r = size / 2 - 14
  const c = 2 * Math.PI * r
  const arc = 0.75
  const filled = (value / 100) * c * arc
  const ticks = Array.from({ length: 31 })
  const color = "var(--accent)"
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[135deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-fg)"
          strokeOpacity={0.1}
          strokeWidth={10}
          strokeDasharray={`${c * arc} ${c}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${filled} ${c}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.7,.2,1)" }}
        />
        {ticks.map((_, i) => {
          const a = (i / (ticks.length - 1)) * arc * 2 * Math.PI
          const r1 = r - 12
          const r2 = r - (i % 5 === 0 ? 20 : 16)
          return (
            <line
              key={i}
              x1={size / 2 + r1 * Math.cos(a)}
              y1={size / 2 + r1 * Math.sin(a)}
              x2={size / 2 + r2 * Math.cos(a)}
              y2={size / 2 + r2 * Math.sin(a)}
              stroke="var(--color-fg)"
              strokeOpacity={0.3}
              strokeWidth={1}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-grid font-semibold leading-none"
          style={{ fontSize: size * 0.26 }}
        >
          {value}
          <span className="text-fg/40" style={{ fontSize: size * 0.11 }}>
            %
          </span>
        </div>
        <div className="mt-1 font-grid text-[11px] uppercase tracking-[0.2em] text-fg/60">
          {label}
        </div>
      </div>
    </div>
  )
}

/*
 * With a three-colour palette, statuses are told apart by weight and fill:
 * strong = solid ink/bone, partial = half-filled, weak = hollow/dashed,
 * missing = accent.
 */
export const STATUS_META: Record<GapStatus, {
  label: string
  color: string
  bg: string
  dot: string
}> = {
  STRONG_MATCH: {
    label: "Strong match",
    color: "text-fg",
    bg: "bg-fg/10 border-fg/45",
    dot: "bg-fg",
  },
  WEAK_EVIDENCE: {
    label: "Weak evidence",
    color: "text-fg/60",
    bg: "border-dashed border-fg/30",
    dot: "border border-current",
  },
  PARTIAL_MATCH: {
    label: "Partial match",
    color: "text-fg/80",
    bg: "bg-fg/[0.04] border-fg/30",
    dot: "border border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]",
  },
  MISSING: {
    label: "Missing",
    color: "text-accent",
    bg: "bg-accent/10 border-accent/40",
    dot: "bg-accent",
  },
}

export function StatusBadge({ status }: { status: GapStatus }) {
  const m = STATUS_META[status]
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-grid text-[11px] uppercase tracking-[0.12em]",
        m.bg,
        m.color,
      )}
    >
      <span className={cx("size-1.5", m.dot)} />
      {m.label}
    </span>
  )
}

const EVIDENCE_TONE: Record<Evidence, string> = {
  STRONG: "border-fg/50 text-fg",
  MODERATE: "border-fg/30 text-fg/80",
  LISTED: "border-dashed border-fg/30 text-fg/60",
  MENTIONED: "border-fg/15 text-fg/45",
}
export function EvidenceBadge({ tier }: { tier: Evidence }) {
  return (
    <span
      className={cx(
        "border px-1.5 py-px font-grid text-[10px] uppercase tracking-[0.14em]",
        EVIDENCE_TONE[tier],
      )}
    >
      {tier}
    </span>
  )
}

export function PriorityTag({ p }: { p: Priority }) {
  return (
    <span
      className={cx(
        "font-grid text-[11px] uppercase tracking-[0.14em]",
        p === "HIGH"
          ? "text-accent"
          : p === "MEDIUM"
            ? "text-fg"
            : "text-fg/50",
      )}
    >
      {p} priority
    </span>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-2xl",
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cx("rise relative w-full", width)}>
        <Bracketed size={9} className="p-1">
          <div className="max-h-[85dvh] overflow-y-auto scroll-thin border border-fg/15 bg-surface">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-fg/10 bg-surface px-6 py-4">
              <h3 className="font-grid text-xl font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 text-fg/60 hover:text-fg"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </Bracketed>
      </div>
    </div>
  )
}

export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Bracketed
        size={6}
        className="mb-5 grid size-16 place-items-center text-fg/70"
      >
        {icon}
      </Bracketed>
      <h4 className="font-grid text-lg font-semibold">{title}</h4>
      <p className="mt-2 max-w-sm text-sm text-fg/60">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  desc,
  actions,
}: {
  eyebrow: string
  title: ReactNode
  desc?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 font-grid text-3xl font-semibold leading-[1.05] md:text-[44px]">
          {title}
        </h1>
        {desc && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg/65">
            {desc}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

export const timeAgo = (t: number) => {
  const s = (Date.now() - t) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

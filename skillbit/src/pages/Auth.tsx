import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  TriangleAlert,
  Mail,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"
import {
  Bracketed,
  Button,
  Label,
  Backdrop,
  LogoMark,
  ThemeToggle,
} from "../components/ui"
import { useApp } from "../lib/store"

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AuthLayout({
  children,
  title,
  sub,
}: {
  children: ReactNode
  title: ReactNode
  sub: ReactNode
}) {
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="theme-dark grain relative isolate hidden overflow-hidden bg-canvas lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Backdrop position="68% 70%" />
        <Link to="/" aria-label="SkillBit home" className="block size-24">
          <LogoMark className="size-full" label="SkillBit" />
        </Link>
        <div>
          <h2 className="font-grid text-[clamp(40px,3.6vw,64px)] font-semibold leading-[1.02]">
            Your next opportunity
            <span className="block text-accent">starts with you.</span>
          </h2>
          <div className="mt-10 grid max-w-xl grid-cols-3 border border-fg/20 bg-canvas/40 backdrop-blur-md">
            {[
              ["Explainable", "fit scores"],
              ["4-stage", "roadmaps"],
              ["ATS-ready", "PDF export"],
            ].map(([a, b], i) => (
              <div key={a} className={i ? "border-l border-fg/20 p-4" : "p-4"}>
                <div className="font-grid text-lg font-semibold">{a}</div>
                <div className="text-sm text-fg/70">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="relative flex flex-col px-6 py-8 md:px-14">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" />
        <div className="relative flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-grid text-sm text-fg/60 hover:text-fg"
          >
            <ArrowLeft size={16} /> Back to site
          </Link>
          <ThemeToggle />
        </div>
        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <LogoMark className="mb-6 size-16 lg:hidden" />
          <h1 className="font-grid text-4xl font-semibold leading-tight">
            {title}
          </h1>
          <p className="mt-2 text-fg/60">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

function ErrorNote({ msg }: { msg: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm"
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-accent" />
      {msg}
    </div>
  )
}

function GoogleButton({
  busy,
  onClick,
}: {
  busy: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="white"
      className="w-full"
      onClick={onClick}
      disabled={busy}
    >
      <GoogleMark />
      <span className="font-machina">Continue with Google</span>
    </Button>
  )
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 font-grid text-[11px] uppercase tracking-[0.2em] text-fg/40">
      <span className="h-px flex-1 bg-fg/15" />
      or with email
      <span className="h-px flex-1 bg-fg/15" />
    </div>
  )
}

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="field pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-fg/50 hover:text-fg"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}

function useAfterAuth() {
  const navigate = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from
  return (role: string) =>
    navigate(from ?? (role === "admin" ? "/app/admin" : "/app"), {
      replace: true,
    })
}

export function Login() {
  const { user, login, loginWithGoogle, resendVerification, verifyOtp } = useApp()
  const after = useAfterAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [loginOtp, setLoginOtp] = useState("")
  const [otpBusy, setOtpBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendMsg, setResendMsg] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  if (user && !busy) return <Navigate to="/app" replace />

  const run = async (fn: () => Promise<{ role: string }>) => {
    setErr("")
    setBusy(true)
    try {
      const u = await fn()
      after(u.role)
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(() => login(email, password))
  }

  const submitLoginOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!loginOtp.trim() || loginOtp.trim().length !== 6) {
      setErr("Please enter the complete 6-digit verification code.")
      return
    }
    setErr("")
    setOtpBusy(true)
    try {
      const u = await verifyOtp(email, loginOtp.trim())
      after(u.role)
    } catch (e) {
      setErr((e as Error).message || "Verification code failed.")
    } finally {
      setOtpBusy(false)
    }
  }

  const isUnverifiedError = err.toLowerCase().includes("verify your email")

  return (
    <AuthLayout
      title="Welcome back"
      sub={
        <>
          Log in to see your fit scores and roadmaps. New here?{" "}
          <Link
            to="/signup"
            className="text-accent underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton busy={busy} onClick={() => run(loginWithGoogle)} />
      <Divider />
      <form onSubmit={submit} className="space-y-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="field"
            placeholder="you@email.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordField
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>

        {err && (
          <div className="space-y-3">
            <ErrorNote msg={err} />
            {isUnverifiedError && email && (
              <div className="border border-accent/40 bg-accent/[0.04] p-3.5 space-y-3">
                <div className="font-grid text-xs font-bold text-accent uppercase tracking-wider text-center">
                  Verify With 6-Digit Code
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="field text-center font-mono font-bold tracking-[0.3em] text-lg flex-1 py-1.5"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    disabled={otpBusy || loginOtp.length !== 6}
                    onClick={submitLoginOtp}
                  >
                    {otpBusy ? <LoaderCircle size={16} className="animate-spin" /> : "Verify"}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={resendBusy || cooldown > 0}
                  onClick={async () => {
                    setResendBusy(true)
                    setResendMsg("")
                    try {
                      const res = await resendVerification(email)
                      setResendMsg(res.message || `Fresh code dispatched to ${email}`)
                      setCooldown(60)
                    } catch (e) {
                      setResendMsg((e as Error).message || "Failed to resend.")
                    } finally {
                      setResendBusy(false)
                    }
                  }}
                >
                  <RefreshCw size={13} className={resendBusy ? "animate-spin" : ""} />
                  <span>
                    {cooldown > 0
                      ? `Resend available in (${cooldown}s)`
                      : resendBusy
                        ? "Dispatching..."
                        : `Resend code to ${email}`}
                  </span>
                </Button>
                {resendMsg && (
                  <div className="border border-fg/20 bg-fg/[0.04] p-2 text-center text-xs text-fg">
                    {resendMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle size={20} className="animate-spin" />
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <Bracketed size={6} className="mt-8 p-[3px]">
        <div className="border border-fg/12 bg-fg/[0.03] p-4">
          <div className="font-grid text-[11px] uppercase tracking-[0.2em] text-fg/50">
            Demo accounts
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["Candidate", "demo@skillbit.ai", "demo1234"],
              ["Placement admin", "admin@skillbit.ai", "admin1234"],
            ].map(([label, em, pw]) => (
              <button
                key={em}
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmail(em)
                  setPassword(pw)
                  run(() => login(em, pw))
                }}
                className="border border-fg/15 px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-accent/10"
              >
                <div className="font-grid text-sm font-medium">{label}</div>
                <div className="text-xs text-fg/50">{em}</div>
              </button>
            ))}
          </div>
        </div>
      </Bracketed>
    </AuthLayout>
  )
}

export function Signup() {
  const { user, signup, loginWithGoogle, resendVerification, verifyOtp } = useApp()
  const after = useAfterAuth()
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" })
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [signupOtp, setSignupOtp] = useState("")
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpErr, setOtpErr] = useState("")
  const [resendBusy, setResendBusy] = useState(false)
  const [resendMsg, setResendMsg] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  if (user && !busy && !registeredEmail) return <Navigate to="/app" replace />

  const strength = [
    f.password.length >= 8,
    /[A-Z]/.test(f.password) || /[^a-zA-Z0-9]/.test(f.password),
    /\d/.test(f.password),
  ].filter(Boolean).length

  const run = async (fn: () => Promise<{ role: string }>) => {
    setErr("")
    setBusy(true)
    try {
      const u = await fn()
      after(u.role)
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (f.name.trim().length < 2) return setErr("Please enter your full name.")
    if (f.password.length < 8)
      return setErr("Password must be at least 8 characters.")
    if (f.password !== f.confirm) return setErr("Passwords do not match.")
    if (!agree) return setErr("Please accept the terms to continue.")

    setErr("")
    setBusy(true)
    signup(f.name, f.email, f.password)
      .then(() => {
        setRegisteredEmail(f.email.trim())
        setCooldown(60) // Start 60s cooldown
      })
      .catch((e) => {
        setErr((e as Error).message)
      })
      .finally(() => {
        setBusy(false)
      })
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!signupOtp.trim() || signupOtp.trim().length !== 6) {
      setOtpErr("Please enter the complete 6-digit code.")
      return
    }
    setOtpErr("")
    setOtpBusy(true)
    try {
      const u = await verifyOtp(registeredEmail, signupOtp.trim())
      after(u.role)
    } catch (e) {
      setOtpErr((e as Error).message || "Verification code failed.")
    } finally {
      setOtpBusy(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resendBusy) return
    setResendBusy(true)
    setResendMsg("")
    setOtpErr("")
    try {
      const res = await resendVerification(registeredEmail)
      setResendMsg(res.message || `Fresh code dispatched to ${registeredEmail}`)
      setCooldown(60)
    } catch (e) {
      setResendMsg((e as Error).message || "Failed to resend.")
    } finally {
      setResendBusy(false)
    }
  }

  if (registeredEmail) {
    return (
      <AuthLayout
        title="Check your email"
        sub="We sent a 6-digit code & link to verify your account."
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Mail size={30} />
            </div>
            <div className="font-grid text-xl font-bold">Check Your Email</div>
            <p className="mt-1 text-sm text-fg/70">
              We dispatched a 6-digit code and activation link to:
            </p>
            <div className="mt-2 inline-block border border-fg/20 bg-fg/[0.04] px-3 py-1 font-mono text-sm font-semibold text-accent">
              {registeredEmail}
            </div>
          </div>

          {/* Form to enter 6-digit code */}
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <Label htmlFor="otp-input" className="block text-center text-xs uppercase tracking-wider text-fg/60">
              Enter 6-Digit Verification Code
            </Label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={signupOtp}
              onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="field text-center font-mono text-2xl font-bold tracking-[0.4em] py-2.5 uppercase"
              autoFocus
            />
            {otpErr && <ErrorNote msg={otpErr} />}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={otpBusy || signupOtp.length !== 6}
            >
              {otpBusy ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                "Verify Code & Enter SkillBit"
              )}
            </Button>
          </form>

          <div className="relative my-3">
            <div className="flex items-center gap-3 font-grid text-[11px] uppercase tracking-[0.2em] text-fg/40">
              <span className="h-px flex-1 bg-fg/15" />
              or click email link
              <span className="h-px flex-1 bg-fg/15" />
            </div>
          </div>

          <p className="text-center text-xs text-fg/50 leading-relaxed">
            You can also click the 1-click activation link directly in the email on your phone or PC.
          </p>

          {resendMsg && (
            <div className="border border-fg/20 bg-fg/[0.04] p-2.5 text-center text-xs text-fg">
              {resendMsg}
            </div>
          )}

          <div className="space-y-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs"
              disabled={resendBusy || cooldown > 0}
              onClick={handleResend}
            >
              <RefreshCw size={14} className={resendBusy ? "animate-spin" : ""} />
              <span>
                {cooldown > 0
                  ? `Resend available in (${cooldown}s)`
                  : resendBusy
                    ? "Dispatching..."
                    : "Resend Code & Link"}
              </span>
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="font-grid text-xs text-accent underline-offset-4 hover:underline"
              >
                Return to Log in
              </Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      sub={
        <>
          Already have one?{" "}
          <Link
            to="/login"
            className="text-accent underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton busy={busy} onClick={() => run(loginWithGoogle)} />
      <Divider />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="name">Full name</Label>
          <input
            id="name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            autoComplete="name"
            className="field"
            placeholder="Alex Rivera"
          />
        </div>
        <div>
          <Label htmlFor="su-email">Email</Label>
          <input
            id="su-email"
            type="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            autoComplete="email"
            className="field"
            placeholder="you@email.com"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="su-pw">Password</Label>
            <PasswordField
              id="su-pw"
              value={f.password}
              onChange={(v) => setF({ ...f, password: v })}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="su-confirm">Confirm</Label>
            <PasswordField
              id="su-confirm"
              value={f.confirm}
              onChange={(v) => setF({ ...f, confirm: v })}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div
          className="flex gap-1.5"
          aria-label={`Password strength ${strength} of 3`}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 ${
                i < strength
                  ? strength === 3
                    ? "bg-fg"
                    : strength === 2
                      ? "bg-fg/50"
                      : "bg-accent"
                  : "bg-fg/10"
              }`}
            />
          ))}
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-fg/65">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 size-4 accent-accent"
          />
          I understand scores are automated ATS alignment indicators and do not
          guarantee employment.
        </label>
        {err && <ErrorNote msg={err} />}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle size={20} className="animate-spin" />
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}

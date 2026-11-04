import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { CheckCircle2, LoaderCircle, Mail, RefreshCw, TriangleAlert, KeyRound } from "lucide-react"
import { Button, Label, LogoMark, ThemeToggle } from "../components/ui"
import { useApp } from "../lib/store"

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get("token")
  const navigate = useNavigate()
  const { verifyEmail, verifyOtp, resendVerification } = useApp()

  const [status, setStatus] = useState<"verifying" | "success" | "error">(token ? "verifying" : "error")
  const [errorMessage, setErrorMessage] = useState(token ? "" : "Please enter your email and 6-digit code below.")
  const [resendEmail, setResendEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpBusy, setOtpBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState("")

  useEffect(() => {
    let active = true

    if (!token) {
      setStatus("error")
      return
    }

    verifyEmail(token)
      .then((user) => {
        if (!active) return
        setStatus("success")
        setTimeout(() => {
          navigate(user.role === "admin" ? "/app/admin" : "/app", { replace: true })
        }, 2000)
      })
      .catch((err) => {
        if (!active) return
        setStatus("error")
        setErrorMessage(
          err?.message || "Invalid or expired verification link. Please enter your 6-digit code below or click resend."
        )
      })

    return () => {
      active = false
    }
  }, [token, verifyEmail, navigate])

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!resendEmail.trim() || !otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage("Please enter both your email address and the 6-digit code.")
      return
    }
    setOtpBusy(true)
    setErrorMessage("")
    try {
      const user = await verifyOtp(resendEmail.trim(), otpCode.trim())
      setStatus("success")
      setTimeout(() => {
        navigate(user.role === "admin" ? "/app/admin" : "/app", { replace: true })
      }, 2000)
    } catch (err) {
      setErrorMessage((err as Error)?.message || "Invalid or expired code.")
    } finally {
      setOtpBusy(false)
    }
  }

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      setErrorMessage("Please enter your email address to request a new code.")
      return
    }
    setResending(true)
    setResendMsg("")
    setErrorMessage("")
    try {
      const res = await resendVerification(resendEmail.trim())
      setResendMsg(res.message || `Fresh verification code dispatched to ${resendEmail}.`)
    } catch (err) {
      setResendMsg((err as Error)?.message || "Failed to resend email.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-6 py-8 md:px-14">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="size-10" />
          <span className="font-grid text-xl font-bold tracking-tight">SkillBit</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <div className="border border-fg/15 bg-canvas/60 p-8 backdrop-blur-md">
          {status === "verifying" && (
            <div className="py-6 text-center">
              <LoaderCircle size={36} className="mx-auto mb-4 animate-spin text-accent" />
              <h1 className="font-grid text-2xl font-bold">Verifying email...</h1>
              <p className="mt-2 text-sm text-fg/60">
                Please wait while we validate your activation token.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="font-grid text-2xl font-bold">Email Verified!</h1>
              <p className="mt-2 text-sm text-fg/60">
                Your account is active. Redirecting you to your workspace...
              </p>
              <Button
                variant="primary"
                className="mt-6 w-full"
                onClick={() => navigate("/app", { replace: true })}
              >
                Continue to SkillBit
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="py-2 text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent">
                <TriangleAlert size={30} />
              </div>
              <h1 className="font-grid text-xl font-bold">Account Verification</h1>
              {errorMessage && (
                <div className="mt-3 border border-accent/30 bg-accent/10 p-3 text-left text-xs text-accent">
                  {errorMessage}
                </div>
              )}

              {/* Form to enter email + 6-digit code */}
              <form onSubmit={handleVerifyOtp} className="mt-5 space-y-3 text-left">
                <div>
                  <Label htmlFor="v-email">Email Address</Label>
                  <input
                    id="v-email"
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="field"
                  />
                </div>
                <div>
                  <Label htmlFor="v-otp">6-Digit Verification Code</Label>
                  <input
                    id="v-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="field text-center font-mono text-xl font-bold tracking-[0.3em]"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={otpBusy || otpCode.length !== 6 || !resendEmail.trim()}
                >
                  {otpBusy ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    "Verify Code & Enter"
                  )}
                </Button>
              </form>

              {resendMsg && (
                <div className="mt-3 border border-fg/20 bg-fg/[0.04] p-2.5 text-xs text-fg text-center">
                  {resendMsg}
                </div>
              )}

              <div className="mt-4 border-t border-fg/15 pt-4 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs"
                  disabled={resending || !resendEmail.trim()}
                  onClick={handleResend}
                >
                  {resending ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Mail size={14} />
                  )}
                  <span>{resending ? "Dispatching..." : "Resend New Code to Email"}</span>
                </Button>

                <div className="text-center">
                  <Link to="/login" className="text-xs text-accent hover:underline">
                    Return to Log in
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

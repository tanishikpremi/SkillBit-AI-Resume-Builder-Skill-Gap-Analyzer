import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, Lock, Mail, User, AlertCircle, CheckCircle2, RefreshCw, KeyRound, Loader2 } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const { register, resendVerification, verifyOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatAuthError = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d) => d.msg || 'Invalid input').join(', ');
    }
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      return 'Cannot reach backend server on http://localhost:8000. Please ensure the backend is running.';
    }
    return err.message || fallback;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, fullName);
      setIsRegistered(true);
      setCooldown(60);
    } catch (err) {
      setError(formatAuthError(err, 'Registration failed. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }
    setOtpError('');
    setOtpLoading(true);
    try {
      await verifyOtp(email, otpCode.trim());
      navigate('/upload');
    } catch (err) {
      setOtpError(formatAuthError(err, 'Invalid or expired verification code.'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMsg('');
    setOtpError('');
    try {
      const res = await resendVerification(email);
      setResendMsg(res.message || `Fresh verification code resent to ${email}`);
      setCooldown(60);
    } catch (err) {
      setResendMsg(formatAuthError(err, 'Failed to resend verification link.'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2FC] glow-mesh flex items-center justify-center p-4 selection:bg-purple-200 selection:text-purple-900">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-3 ring-4 ring-white p-3">
            <img src={logoImg} alt="SkillBit Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1E1B2E] tracking-tight flex items-center gap-2">
            Create Your Account
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-lime-100 text-lime-800 border border-lime-300 font-mono font-bold tracking-wider">
              AI
            </span>
          </h1>
          <p className="text-xs text-[#706886] mt-1.5 font-medium leading-relaxed">
            Build ATS Resumes & Bridge Skill Gaps with Explainable AI
          </p>
        </div>

        <div className="bg-white p-7 sm:p-9 rounded-3xl border border-[#ECE5F6] shadow-saas">
          {isRegistered ? (
            /* Post-Registration Dual-Choice Verification Card */
            <div className="py-2 animate-in fade-in zoom-in-95 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-3xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-inner">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-[#1E1B2E]">Check Your Email</h2>
                <p className="text-xs text-[#706886] mt-1.5 leading-relaxed">
                  We've sent a 6-digit code and activation link to:
                </p>
                <div className="mt-2 py-1 px-3 bg-[#FAF8FD] rounded-xl border border-purple-100 text-xs font-bold text-purple-900 font-mono inline-block">
                  {email}
                </div>
              </div>

              {/* Form 1: Enter 6-digit code */}
              <form onSubmit={handleVerifyOtp} className="space-y-3 pt-2">
                <label className="block text-center text-[11px] font-bold text-[#524B68] uppercase tracking-wider">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center font-mono text-2xl font-bold tracking-[0.4em] py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                  autoFocus
                />

                {otpError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Enter SkillBit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#ECE5F6]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[#9D93B4] text-[10px] uppercase tracking-wider font-bold">
                    Or 1-Click Link
                  </span>
                </div>
              </div>

              <p className="text-center text-xs text-[#706886] leading-relaxed">
                You can also click the 1-click activation link directly in the email to verify and log in.
              </p>

              {resendMsg && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 font-medium text-center">
                  {resendMsg}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || cooldown > 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#FAF8FD] hover:bg-purple-50 border border-[#ECE5F6] text-purple-700 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {resendLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {cooldown > 0
                          ? `Resend available in (${cooldown}s)`
                          : 'Resend Code & Link'}
                      </span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link to="/login" className="text-xs text-purple-600 font-bold hover:underline">
                    Proceed to Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Registration Form */
            <>
              {error && (
                <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#9D93B4] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9D93B4] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9D93B4] absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {loading ? 'Creating Account & Sending Mail...' : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-[#706886]">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-600 font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

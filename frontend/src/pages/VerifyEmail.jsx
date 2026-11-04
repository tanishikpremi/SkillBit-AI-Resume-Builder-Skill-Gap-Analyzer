import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { verifyEmail, resendVerification } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    let isMounted = true;

    const performVerification = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token provided in the URL.');
        return;
      }

      try {
        await verifyEmail(token);
        if (isMounted) {
          setStatus('success');
          // Auto-redirect to upload/dashboard after 2.5 seconds
          setTimeout(() => {
            navigate('/upload');
          }, 2500);
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          const detail = err.response?.data?.detail;
          if (typeof detail === 'string') {
            setErrorMessage(detail);
          } else {
            setErrorMessage('This verification link is invalid or has expired.');
          }
        }
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendLoading(true);
    setResendStatus({ type: '', message: '' });
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendStatus({
        type: 'success',
        message: res.message || `A new verification email has been sent to ${resendEmail}.`
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setResendStatus({
        type: 'error',
        message: typeof detail === 'string' ? detail : 'Failed to resend verification email. Please try again.'
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2FC] glow-mesh flex items-center justify-center p-4 selection:bg-purple-200 selection:text-purple-900">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-3 ring-4 ring-white p-3">
            <img src={logoImg} alt="SkillBit Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1E1B2E] tracking-tight flex items-center gap-2">
            SkillBit
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-lime-100 text-lime-800 border border-lime-300 font-mono font-bold tracking-wider">
              AI
            </span>
          </h1>
          <p className="text-xs text-[#706886] mt-1.5 font-medium leading-relaxed">
            Account Activation & Email Verification
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white p-7 sm:p-9 rounded-3xl border border-[#ECE5F6] shadow-saas">
          {status === 'verifying' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-[#1E1B2E]">Verifying your email...</h2>
              <p className="text-xs text-[#706886] mt-1.5">
                Connecting to SkillBit authentication service to validate your token.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-in zoom-in-75">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-[#1E1B2E]">Email Verified Successfully!</h2>
              <p className="text-xs text-[#706886] mt-2 max-w-sm mx-auto leading-relaxed">
                Your account is now fully active. Redirecting you to your ATS workspace...
              </p>

              <button
                onClick={() => navigate('/upload')}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all active:scale-[0.99]"
              >
                <span>Continue to SkillBit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-[#1E1B2E]">Verification Failed</h2>
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-2xl mt-3 font-medium text-left">
                {errorMessage}
              </p>

              {/* Resend Form */}
              <div className="mt-6 border-t border-[#ECE5F6] pt-5 text-left">
                <h3 className="text-xs font-bold text-[#1E1B2E] mb-1">
                  Need a new verification link?
                </h3>
                <p className="text-[11px] text-[#706886] mb-3">
                  Enter your email address below to receive a fresh verification link.
                </p>

                {resendStatus.message && (
                  <div
                    className={`mb-3 p-3 rounded-xl text-xs font-medium ${
                      resendStatus.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}
                  >
                    {resendStatus.message}
                  </div>
                )}

                <form onSubmit={handleResend} className="space-y-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9D93B4] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-all disabled:opacity-50"
                  >
                    {resendLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-xs text-purple-600 font-bold hover:underline">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


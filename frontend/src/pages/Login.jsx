import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/upload');
    } catch (err) {
      setError(formatAuthError(err, 'Invalid email or password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass) => {
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      navigate('/upload');
    } catch (err) {
      setError(formatAuthError(err, 'Demo login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2FC] glow-mesh flex items-center justify-center p-4 selection:bg-purple-200 selection:text-purple-900">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-[#11121F] border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-3 ring-4 ring-white p-2.5">
            <img src="/logo.png" alt="SkillBit Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1E1B2E] tracking-tight flex items-center gap-2">
            SkillBit
          </h1>
          <p className="text-xs text-[#706886] mt-1.5 max-w-xs font-medium leading-relaxed">
            Next-Gen AI Resume Builder & Explainable Skill Gap Engine
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-7 sm:p-9 rounded-3xl border border-[#ECE5F6] shadow-saas">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Primary Action: Google Authentication */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-sm font-bold text-[#1E1B2E]">Welcome! Get Started</h2>
              <p className="text-xs text-[#706886] mt-0.5">
                Sign in with your Google account. New accounts are provisioned automatically.
              </p>
            </div>

            <GoogleSignInButton
              onSuccess={() => navigate('/upload')}
              onError={(err) => setError(err)}
            />
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#ECE5F6]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#9D93B4] text-[11px] uppercase tracking-wider font-bold">
                Or existing credentials
              </span>
            </div>
          </div>

          {/* Collapsible Email/Password Login */}
          <div>
            <button
              type="button"
              onClick={() => setShowEmailLogin(!showEmailLogin)}
              className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-[#FAF8FD] hover:bg-[#F3EEFA] border border-[#ECE5F6] text-xs text-[#524B68] hover:text-[#1E1B2E] transition-all"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Mail className="w-3.5 h-3.5 text-purple-600" />
                Sign in with email & password
              </span>
              {showEmailLogin ? <ChevronUp className="w-3.5 h-3.5 text-[#706886]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#706886]" />}
            </button>

            {showEmailLogin && (
              <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3.5 animate-in fade-in">
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
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {loading ? 'Authenticating...' : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Quick One-Click Demo Logins */}
          <div className="mt-6 pt-5 border-t border-[#ECE5F6]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9D93B4] block mb-2.5 text-center">
              Quick One-Click Test Accounts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@skillbit.ai', 'AdminPass123!')}
                className="py-2 px-3 rounded-xl bg-[#FAF8FD] hover:bg-purple-50 text-[#332D47] border border-[#ECE5F6] text-center hover:border-purple-300 transition-all flex items-center justify-center gap-1.5 font-medium shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('sarah.connor@example.com', 'Resistance2026!')}
                className="py-2 px-3 rounded-xl bg-[#FAF8FD] hover:bg-purple-50 text-[#332D47] border border-[#ECE5F6] text-center hover:border-purple-300 transition-all font-medium shadow-xs"
              >
                Candidate
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#706886]">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-600 font-bold hover:underline">
              Create an Account
            </Link>
          </p>

          <div className="mt-5 text-center">
            <p className="text-[11px] text-[#9D93B4] flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Secure Authentication via Google OAuth 2.0 & JWT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

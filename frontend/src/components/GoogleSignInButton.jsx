import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2, KeyRound, Sparkles, UserCheck } from 'lucide-react';

export default function GoogleSignInButton({ onSuccess, onError }) {
  const { googleClientId, loginWithGoogle } = useAuth();
  const googleBtnRef = useRef(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoEmail, setDemoEmail] = useState('alex.developer@gmail.com');
  const [demoName, setDemoName] = useState('Alex Developer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  useEffect(() => {
    // Check if Google GSI SDK is available
    const checkGsi = () => {
      if (window.google?.accounts?.id) {
        setIsSdkLoaded(true);
        if (googleClientId && googleBtnRef.current) {
          try {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: async (response) => {
                try {
                  setIsSubmitting(true);
                  await loginWithGoogle({ credential: response.credential });
                  if (onSuccess) onSuccess();
                } catch (err) {
                  console.error('Google Sign-In failed:', err);
                  const msg = err.response?.data?.detail 
                    || (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')
                        ? 'Backend server is not running on http://localhost:8000. Please start the backend server.'
                        : err.message || 'Google sign-in failed');
                  if (onError) onError(msg);
                } finally {
                  setIsSubmitting(false);
                }
              },
            });

            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'filled_black',
              size: 'large',
              shape: 'pill',
              width: 340,
              text: 'continue_with',
              logo_alignment: 'left',
            });
          } catch (e) {
            console.warn('Error initializing Google GIS button:', e);
          }
        }
      }
    };

    checkGsi();
    const interval = setInterval(checkGsi, 500);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [googleClientId]);

  const handleSimulatedGoogleLogin = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      await loginWithGoogle({
        email: demoEmail,
        full_name: demoName,
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${demoEmail}`
      });
      setShowDemoModal(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.detail 
        || (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')
            ? 'Backend server is not running on http://localhost:8000. Please start the backend server.'
            : err.message || 'Google authentication failed');
      if (onError) onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Official GIS Button container (if Client ID exists) */}
      {googleClientId ? (
        <div className="w-full flex flex-col items-center gap-3">
          <div ref={googleBtnRef} className="min-h-[44px] flex justify-center w-full" />
          <button
            type="button"
            onClick={() => setShowDemoModal(true)}
            className="text-[11px] text-[#706886] hover:text-purple-600 font-medium transition-colors"
          >
            Or test with Instant Google Demo profile
          </button>
        </div>
      ) : (
        /* Fallback branded Google Sign In button if Client ID is not configured yet */
        <div className="w-full space-y-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowDemoModal(true)}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-[#FAF8FD] text-[#1E1B2E] font-semibold text-xs border border-[#ECE5F6] shadow-sm hover:shadow-saas transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSubmitting ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center justify-between px-1 text-[11px] text-[#706886]">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-registers new accounts
            </span>
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="text-purple-600 hover:underline font-mono text-[10px]"
            >
              Configure OAuth Client ID
            </button>
          </div>
        </div>
      )}

      {/* Simulated Google Login / Client ID Setup Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-[#11121F]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#ECE5F6] w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE5F6] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E1B2E]">Google Authentication</h3>
                  <p className="text-[11px] text-[#706886]">One-click auto-registration & login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-xl bg-[#FAF8FD] hover:bg-[#F3EEFA] text-[#706886] hover:text-[#1E1B2E] flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulatedGoogleLogin} className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 text-xs text-purple-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-purple-800">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  Instant Google Provisioning
                </p>
                <p className="text-[#524B68] text-[11px] leading-relaxed">
                  Signing in with Google automatically creates your user profile and workspace without requiring any manual password registration.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                  Google Account Name
                </label>
                <input
                  type="text"
                  required
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#524B68] uppercase tracking-wider mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  placeholder="username@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8FD] border border-[#ECE5F6] text-xs text-[#1E1B2E] placeholder-[#9D93B4] focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In as this Google Account'}
              </button>

              <div className="pt-3 border-t border-[#ECE5F6] text-[11px] text-[#706886] space-y-1.5">
                <p className="font-bold text-[#332D47] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  Production Google OAuth Setup:
                </p>
                <p className="text-[10px] leading-relaxed">
                  To connect your real Google Cloud Project Client ID, set <code className="text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded text-[10px]">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-[#332D47] font-semibold">frontend/.env</code>.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

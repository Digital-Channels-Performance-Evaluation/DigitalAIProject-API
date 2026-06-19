"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import AhaduLogo from "@/components/AhaduLogo";
import { User, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [mfaCode, setMfaCode]     = useState("");
  const [showMfa, setShowMfa]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const { login } = useAuthStore();
  const router    = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, showMfa ? mfaCode : undefined);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = error?.response?.data?.detail || error?.message || "Login failed";
      if (msg === "MFA code required") {
        setShowMfa(true);
        toast.info("Please enter your MFA code");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    /* ── Outer page — light gray background ─────────────────────────────── */
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">

      {/* ── Card container ───────────────────────────────────────────────── */}
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex
                      min-h-[480px]">

        {/* ── LEFT — Brand panel ──────────────────────────────────────────── */}
        <div className="w-[42%] flex-shrink-0 flex flex-col justify-between p-8 relative
                        overflow-hidden"
             style={{ background: "linear-gradient(160deg, #9B1535 0%, #7A0E28 55%, #5E0B1E 100%)" }}>

          {/* Subtle radial glow in top-right */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none"
               style={{ background: "radial-gradient(circle, #BE1B3C 0%, transparent 70%)" }} />

          {/* Top — logo + name row */}
          <div>
            <div className="flex items-center gap-2.5 mb-8">
              {/* White bg container so the logo shows on the crimson panel */}
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm bg-white p-0.5">
                <AhaduLogo size={32} />
              </div>
              <span className="text-white text-sm font-semibold tracking-wide">
                Ahadu Pulse
              </span>
            </div>

            {/* Bank name + description */}
            <h1 className="text-3xl font-black text-white leading-tight mb-3">
              Ahadu Pulse
            </h1>
            <p className="text-white/65 text-sm leading-relaxed">
              AI-powered digital banking product evaluation platform for real-time
              performance scoring, predictions, and insights.
            </p>
          </div>

          {/* Centre — big logo tile */}
          <div className="flex justify-center my-6">
            <div className="w-36 h-36 rounded-3xl flex items-center justify-center"
                 style={{ background: "rgba(255,255,255,0.12)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
              {/* White bg so logo is visible on crimson panel */}
              <div className="w-24 h-24 rounded-2xl bg-white flex items-center
                              justify-center shadow-lg p-2">
                <AhaduLogo size={80} />
              </div>
            </div>
          </div>

          {/* Bottom — copyright */}
          <p className="text-white/35 text-[10px]">
            © {new Date().getFullYear()} Ahadu Bank S.C. All rights reserved.
          </p>
        </div>

        {/* ── RIGHT — Login form ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-10 py-10">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email / Username */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase
                                tracking-widest mb-2">
                Username
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-700
                             bg-gray-100 border-0 focus:outline-none focus:ring-2
                             focus:bg-white transition placeholder:text-gray-400"
                  style={{ "--tw-ring-color": "#9B1535" } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase
                                tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-gray-700
                             bg-gray-100 border-0 focus:outline-none focus:ring-2
                             focus:bg-white transition placeholder:text-gray-400"
                  style={{ "--tw-ring-color": "#9B1535" } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* MFA code — only shown if required */}
            {showMfa && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase
                                  tracking-widest mb-2">
                  MFA Code
                </label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl text-sm text-gray-700 bg-gray-100
                             border-0 focus:outline-none focus:ring-2 focus:bg-white
                             transition text-center tracking-widest"
                  style={{ "--tw-ring-color": "#9B1535" } as React.CSSProperties}
                />
              </div>
            )}

            {/* Sign in button — matches the image style */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white text-sm font-semibold
                         flex items-center justify-center gap-2 transition-all
                         duration-150 disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-md hover:shadow-lg active:scale-[0.99]"
              style={{ background: "#9B1535" }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = "#7A0E28")}
              onMouseLeave={e => !loading && (e.currentTarget.style.background = "#9B1535")}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <p className="text-center text-[10px] text-gray-300 mt-8">
          </p>
        </div>

      </div>
    </div>
  );
}

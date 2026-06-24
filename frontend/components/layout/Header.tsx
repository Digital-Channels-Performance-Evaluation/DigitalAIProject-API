"use client";
import {
  Bell, Search, X, LogOut, Settings, User, ChevronDown,
  Lock, Camera, Eye, EyeOff, KeyRound,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { formatRoleName } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

interface HeaderProps { title: string; subtitle?: string; }

const SEARCH_LINKS = [
  { label: "Dashboard",           href: "/dashboard",                 category: "Page" },
  { label: "Products",            href: "/dashboard/products",        category: "Page" },
  { label: "Rankings",            href: "/dashboard/rankings",        category: "Page" },
  { label: "Alerts",              href: "/dashboard/alerts",          category: "Page" },
  { label: "Recommendations",     href: "/dashboard/recommendations", category: "Page" },
  { label: "Predictions",         href: "/dashboard/predictions",     category: "Page" },
  { label: "Model Management",    href: "/dashboard/models",          category: "Page" },
  { label: "Settings / Upload",   href: "/dashboard/settings",        category: "Page" },
  { label: "Users",               href: "/dashboard/users",           category: "Page" },
];

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, logout, updateAvatar } = useAuthStore();
  const router = useRouter();

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchVal,  setSearchVal]  = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const filteredLinks = searchVal.trim()
    ? SEARCH_LINKS.filter(l => l.label.toLowerCase().includes(searchVal.toLowerCase()))
    : SEARCH_LINKS;

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [alerts,     setAlerts]     = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await api.get("/alerts?is_resolved=false&limit=5");
      setAlerts(res.data || []);
      setAlertCount(res.data?.length || 0);
    } catch { /* silent */ }
  }, []);
  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  // ── Profile dropdown ──────────────────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Change Password modal ─────────────────────────────────────────────────
  const [pwModal,    setPwModal]    = useState(false);
  const [pwForm,     setPwForm]     = useState({ current: "", next: "", confirm: "" });
  const [pwLoading,  setPwLoading]  = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  setSearchOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const severityDot: Record<string, string> = {
    critical: "#991B1B", high: "#7C2D12", medium: "#78350F", low: "#14532D",
  };

  // ── Change password handler ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (pwForm.next.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwForm.current,
        new_password: pwForm.next,
      });
      toast.success("Password changed successfully");
      setPwModal(false);
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  // ── Avatar upload handler ─────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/auth/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateAvatar(res.data.avatar_url);
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to upload photo");
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Avatar element (reused in multiple places) ────────────────────────────
  const AvatarCircle = ({ size = 7, textSize = "[11px]" }: { size?: number; textSize?: string }) => (
    user?.avatar_url ? (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 border-2 border-white/30`}
      />
    ) : (
      <div
        className={`w-${size} h-${size} rounded-full text-white text-${textSize} font-bold
                    flex items-center justify-center flex-shrink-0 shadow-sm`}
        style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}
      >
        {initials}
      </div>
    )
  );

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-100 flex items-center
                         justify-between px-6 sticky top-0 z-30 shadow-sm">

        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full flex-shrink-0"
               style={{ background: "linear-gradient(180deg,#9B1535,#BE1B3C)" }} />
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">{title}</h1>
            {subtitle && <p className="text-[11px] text-gray-400 leading-tight">{subtitle}</p>}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">

          {/* Search */}
          <div className="relative hidden md:block" ref={searchRef}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchVal}
                onChange={e => { setSearchVal(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search pages..."
                className="pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg
                           bg-gray-50 focus:outline-none w-48 transition"
              />
              {searchVal && (
                <button onClick={() => { setSearchVal(""); setSearchOpen(false); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
            {searchOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl
                              border border-gray-100 shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-50">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
                    {searchVal ? `Results for "${searchVal}"` : "Quick navigation"}
                  </p>
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {filteredLinks.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-gray-400 text-center">No pages found</p>
                  ) : filteredLinks.map(link => (
                    <button key={link.href}
                      onClick={() => { router.push(link.href); setSearchOpen(false); setSearchVal(""); }}
                      className="w-full flex items-center justify-between px-3 py-2.5
                                 hover:bg-gray-50 transition text-left">
                      <span className="text-xs font-medium text-gray-800">{link.label}</span>
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {link.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(v => !v); if (!notifOpen) loadAlerts(); setProfileOpen(false); }}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Bell size={17} className="text-gray-600" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full text-white
                                 text-[9px] font-bold flex items-center justify-center px-1"
                      style={{ background: "#9B1535" }}>
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl
                              border border-gray-100 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
                     style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                  <div className="flex items-center gap-2">
                    <Bell size={13} className="text-white" />
                    <span className="text-white text-xs font-semibold">Active Alerts</span>
                    {alertCount > 0 && (
                      <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {alertCount}
                      </span>
                    )}
                  </div>
                  <button onClick={() => { router.push("/dashboard/alerts"); setNotifOpen(false); }}
                          className="text-white/70 hover:text-white text-[10px] transition">
                    View all →
                  </button>
                </div>
                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="text-2xl mb-2">✓</div>
                      <p className="text-xs text-gray-400">No active alerts</p>
                    </div>
                  ) : alerts.map((a: any) => (
                    <div key={a.id}
                         className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                         onClick={() => { router.push("/dashboard/alerts"); setNotifOpen(false); }}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                             style={{ background: severityDot[a.severity] || "#666" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{a.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{a.product_name} · {a.period_date}</p>
                        </div>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{
                                color: severityDot[a.severity] || "#666",
                                background: severityDot[a.severity] ? `${severityDot[a.severity]}18` : "#f3f4f6",
                              }}>
                          {a.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {alerts.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                    <button onClick={() => { router.push("/dashboard/alerts"); setNotifOpen(false); }}
                            className="w-full text-xs font-medium py-1.5 rounded-lg text-white transition"
                            style={{ background: "#9B1535" }}>
                      Manage All Alerts
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setSearchOpen(false); }}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition"
            >
              <AvatarCircle size={7} textSize="[11px]" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-tight">
                  {user?.full_name?.split(" ")[0] || "User"}
                </p>
                <p className="text-[9px] text-gray-400 leading-tight">
                  {formatRoleName(user?.role || "")}
                </p>
              </div>
              <ChevronDown size={11} className={`text-gray-400 transition-transform hidden md:block
                ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl
                              border border-gray-100 shadow-xl z-50 overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-4 border-b border-gray-100"
                     style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                  <div className="flex items-center gap-3">
                    {/* Avatar with upload button */}
                    <div className="relative flex-shrink-0">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name}
                             className="w-11 h-11 rounded-full object-cover border-2 border-white/40" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-white/20 border border-white/30
                                        flex items-center justify-center text-white text-sm font-bold">
                          {initials}
                        </div>
                      )}
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarLoading}
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white
                                   flex items-center justify-center shadow-md hover:bg-gray-100 transition"
                        title="Change photo"
                      >
                        {avatarLoading
                          ? <svg className="animate-spin w-3 h-3 text-[#9B1535]" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          : <Camera size={10} className="text-[#9B1535]" />
                        }
                      </button>
                      <input ref={avatarInputRef} type="file" accept="image/*"
                             className="hidden" onChange={handleAvatarChange} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold leading-tight truncate">
                        {user?.full_name}
                      </p>
                      <p className="text-white/60 text-[10px] leading-tight mt-0.5 truncate">
                        {user?.email}
                      </p>
                      <p className="text-white/50 text-[9px] leading-tight mt-0.5">
                        {formatRoleName(user?.role || "")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1">
                  <button
                    onClick={() => { router.push("/dashboard/settings"); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs
                               text-gray-600 hover:bg-gray-50 rounded-lg transition text-left"
                  >
                    <Settings size={13} className="text-gray-400" />
                    Settings &amp; Data Upload
                  </button>

                  <button
                    onClick={() => { setProfileOpen(false); setPwModal(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs
                               text-gray-600 hover:bg-gray-50 rounded-lg transition text-left"
                  >
                    <Lock size={13} className="text-gray-400" />
                    Change Password
                  </button>

                  {(user?.role === "super_admin" || user?.role === "executive_management") && (
                    <button
                      onClick={() => { router.push("/dashboard/users"); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs
                                 text-gray-600 hover:bg-gray-50 rounded-lg transition text-left"
                    >
                      <User size={13} className="text-gray-400" />
                      User Management
                    </button>
                  )}

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={() => { logout(); router.push("/login"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs
                               rounded-lg transition font-medium text-left"
                    style={{ color: "#9B1535" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FBF0F3")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Change Password Modal ─────────────────────────────────────────── */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                <KeyRound size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Change Password</h2>
                <p className="text-[10px] text-gray-400">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              {/* Current password */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={pwForm.current}
                    onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-1 focus:ring-[#9B1535]"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNext ? "text" : "password"}
                    value={pwForm.next}
                    onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                    required minLength={8}
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-1 focus:ring-[#9B1535]"
                    placeholder="Min 8 characters"
                  />
                  <button type="button" onClick={() => setShowNext(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    required minLength={8}
                    className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg
                               focus:outline-none focus:ring-1 focus:ring-[#9B1535] ${
                                 pwForm.confirm && pwForm.next !== pwForm.confirm
                                   ? "border-red-300 bg-red-50"
                                   : "border-gray-200"
                               }`}
                    placeholder="Repeat new password"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setPwModal(false); setPwForm({ current: "", next: "", confirm: "" }); }}
                        className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600
                                   hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={pwLoading || (!!pwForm.confirm && pwForm.next !== pwForm.confirm)}
                        className="flex-1 py-2.5 text-white rounded-lg text-sm font-semibold
                                   transition disabled:opacity-60"
                        style={{ background: "#9B1535" }}>
                  {pwLoading ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

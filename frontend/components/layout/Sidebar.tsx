"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { cn, formatRoleName } from "@/lib/utils";
import AhaduLogo from "@/components/AhaduLogo";
import {
  LayoutDashboard, Layers, BarChart3, Trophy, Bell,
  Lightbulb, FileText, Brain, Users, Settings, LogOut, ChevronRight,
  TrendingUp, Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",                     label: "Dashboard",        icon: LayoutDashboard },
  { href: "/dashboard/products",            label: "Products",         icon: Layers },
  { href: "/dashboard/scores",              label: "Scores",           icon: BarChart3 },
  { href: "/dashboard/rankings",            label: "Rankings",         icon: Trophy },
  { href: "/dashboard/alerts",              label: "Alerts",           icon: Bell },
  { href: "/dashboard/recommendations",     label: "Recommendations",  icon: Lightbulb },
  { href: "/dashboard/predictions",         label: "Predictions",      icon: TrendingUp },
  { href: "/dashboard/reports",             label: "Reports",          icon: FileText },
  { href: "/dashboard/models",              label: "Model Management", icon: Brain },
  { href: "/dashboard/insights",            label: "Executive Insights", icon: Sparkles },
  { href: "/dashboard/users",               label: "Users",            icon: Users,
    roles: ["super_admin", "executive_management"] },
  { href: "/dashboard/settings",            label: "Settings",         icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40"
           style={{ background: "linear-gradient(180deg, #7A0E28 0%, #5E0B1E 100%)",
                    boxShadow: "2px 0 12px rgba(122,14,40,0.35)" }}>

      {/* ── Logo ── */}
      <div className="p-5 border-b border-white/10"
           style={{ background: "linear-gradient(135deg, #8A1230, #9B1535)" }}>
        <div className="flex items-center gap-3">
          {/* Official Ahadu Bank logo — white bg so visible on crimson sidebar */}
          <div className="w-11 h-11 rounded-xl bg-white flex-shrink-0 shadow-sm
                          flex items-center justify-center p-1">
            <AhaduLogo size={36} />
          </div>
          <div className="min-w-0">
            <div className="text-white font-black text-sm leading-tight tracking-tight">
              Ahadu Plus
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-semibold tracking-wide leading-none"
                    style={{ color: "#EDB0BF" }}>
                AI-Powered Evaluation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <p className="text-white/30 text-[9px] uppercase tracking-widest font-semibold px-3 mb-2 mt-1">
          Navigation
        </p>
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                  isActive
                    ? "bg-white/20 text-white font-semibold shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  size={17}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-white" : "text-white/50 group-hover:text-white/80"
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && (
                  <ChevronRight size={13} className="text-white/60 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── User Profile ── */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30
                          flex items-center justify-center text-white text-sm font-bold
                          flex-shrink-0">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">
              {user?.full_name || "User"}
            </div>
            <div className="text-white/50 text-[10px] truncate">
              {formatRoleName(user?.role || "")}
            </div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/60
                     hover:text-white hover:bg-white/10 rounded-lg text-xs transition"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

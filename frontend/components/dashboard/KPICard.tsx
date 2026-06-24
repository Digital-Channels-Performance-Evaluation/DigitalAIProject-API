import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  iconBg?: string;
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, iconBg }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {trendValue && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend === "up" ? "text-green-700" : trend === "down" ? "text-red-700" : "text-gray-500"
            )}>
              <span>{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
          iconBg || "bg-[#FBF0F3]"
        )}>
          <Icon size={20} className="text-[#9B1535]" />
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

interface Insight {
  product: string;
  type: "positive" | "warning" | "critical" | "summary";
  insight: string;
}

const TYPE_STYLE: Record<string, {
  border: string; bg: string; icon: any;
  label: string; textColor: string; iconBg: string;
}> = {
  positive: {
    border: "border-l-4 border-green-500", bg: "bg-green-50",
    icon: TrendingUp, label: "Positive", textColor: "text-green-700", iconBg: "bg-green-100",
  },
  warning: {
    border: "border-l-4 border-amber-500", bg: "bg-amber-50",
    icon: AlertTriangle, label: "Action Needed", textColor: "text-amber-700", iconBg: "bg-amber-100",
  },
  critical: {
    border: "border-l-4 border-red-600", bg: "bg-red-50",
    icon: AlertTriangle, label: "Critical", textColor: "text-red-700", iconBg: "bg-red-100",
  },
  summary: {
    border: "border-l-4 border-[#9B1535]", bg: "bg-[#FBF0F3]",
    icon: BarChart3, label: "Platform Summary", textColor: "text-[#7A0E28]", iconBg: "bg-[#F6D9E1]",
  },
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/ml/insights");
      setInsights(res.data.insights || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      if (!silent) toast.error("Failed to load executive insights");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefresh(load);

  const summary   = insights.filter(i => i.type === "summary");
  const critical  = insights.filter(i => i.type === "critical");
  const warnings  = insights.filter(i => i.type === "warning");
  const positives = insights.filter(i => i.type === "positive");

  const InsightCard = ({ insight }: { insight: Insight }) => {
    const style = TYPE_STYLE[insight.type] ?? TYPE_STYLE.summary;
    const Icon = style.icon;
    return (
      <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${style.iconBg}`}>
            <Icon size={14} className={style.textColor} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${style.textColor}`}>
                {style.label}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">{insight.product}</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{insight.insight}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Header
        title="Executive Insights"
        subtitle="AI-generated strategic insights from uploaded dataset"
      />
      <div className="p-6 space-y-5">

        {/* Header action bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Sparkles size={13} className="text-[#9B1535]" />
            <span>Insights generated dynamically from latest uploaded data</span>
            {lastUpdated && (
              <span className="text-gray-400">· Last updated: {lastUpdated}</span>
            )}
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-white px-3 py-2 rounded-lg
                       font-semibold transition disabled:opacity-50"
            style={{ background: refreshing ? "#9CA3AF" : "#9B1535" }}
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Insights"}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-card">
            <Sparkles size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No insights available yet.</p>
            <p className="text-gray-300 text-xs mt-1">
              Upload a dataset to generate AI insights.
            </p>
          </div>
        ) : (
          <div className="space-y-5">

            {summary.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <BarChart3 size={12} className="text-[#9B1535]" />
                  Platform Overview
                </h3>
                <div className="space-y-2">
                  {summary.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                </div>
              </div>
            )}

            {critical.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Critical — Immediate Action Required ({critical.length})
                </h3>
                <div className="space-y-2">
                  {critical.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Action Needed ({warnings.length})
                </h3>
                <div className="space-y-2">
                  {warnings.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                </div>
              </div>
            )}

            {positives.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle size={12} />
                  Positive Trends ({positives.length})
                </h3>
                <div className="space-y-2">
                  {positives.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

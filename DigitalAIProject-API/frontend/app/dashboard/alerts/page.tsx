"use client";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import SeverityBadge from "@/components/dashboard/SeverityBadge";
import api from "@/lib/api";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

interface Alert {
  id: number;
  product_name: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  metric_name: string;
  metric_value: number;
  is_resolved: boolean;
  period_date: string;
  created_at: string;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  score_drop: "Score Drop",
  downtime_spike: "Downtime Spike",
  failure_rate_increase: "Failure Rate",
  complaint_surge: "Complaint Surge",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      let url = `/alerts?limit=100`;
      if (filterSeverity) url += `&severity=${filterSeverity}`;
      if (filterType) url += `&alert_type=${filterType}`;
      if (!showResolved) url += `&is_resolved=false`;
      const [alertsRes, summaryRes] = await Promise.all([
        api.get(url),
        api.get("/alerts/summary"),
      ]);
      setAlerts(alertsRes.data);
      setSummary(summaryRes.data);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [filterSeverity, filterType, showResolved]);

  useEffect(() => { load(); }, [load]);
  useRefresh(load);

  const resolve = async (id: number) => {
    try {
      await api.post(`/alerts/${id}/resolve`);
      toast.success("Alert resolved");
      load();
    } catch {
      toast.error("Failed to resolve alert");
    }
  };

  return (
    <div>
      <Header title="Alerts Dashboard" subtitle="Monitor and respond to critical system alerts" />
      <div className="p-6 space-y-5">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Unresolved", value: summary.total_unresolved, bg: "bg-white" },
              { label: "Critical", value: summary.by_severity.critical, bg: "bg-[#FDECEA]", text: "text-[#8B1A1A]" },
              { label: "High", value: summary.by_severity.high, bg: "bg-[#FFF0E6]", text: "text-[#7A3A00]" },
              { label: "Medium", value: summary.by_severity.medium, bg: "bg-[#FFF8E1]", text: "text-[#7A5C00]" },
              { label: "Low", value: summary.by_severity.low, bg: "bg-[#E8F5ED]", text: "text-[#1A4A2A]" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl border border-gray-100 p-4 shadow-card`}>
                <div className={`text-2xl font-bold ${s.text || "text-gray-900"}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3">
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#9B1535]">
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#9B1535]">
            <option value="">All Types</option>
            <option value="score_drop">Score Drop</option>
            <option value="downtime_spike">Downtime Spike</option>
            <option value="failure_rate_increase">Failure Rate</option>
            <option value="complaint_surge">Complaint Surge</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-[#9B1535]" />
            Show Resolved
          </label>
          <span className="text-xs text-gray-400 ml-auto self-center">{alerts.length} alerts</span>
        </div>

        {/* Alerts List */}
        <div className="space-y-2">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 animate-pulse h-20" />
            ))
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-gray-500 text-sm">No alerts matching your filters</p>
            </div>
          ) : alerts.map((a) => (
            <div key={a.id} className={`bg-white rounded-xl border border-gray-100 p-4 shadow-card flex items-start gap-4 ${a.is_resolved ? "opacity-60" : ""}`}>
              <div className="flex-shrink-0 pt-0.5">
                <SeverityBadge severity={a.severity} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-gray-600">
                    {ALERT_TYPE_LABELS[a.alert_type] || a.alert_type}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{a.product_name}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">{a.period_date}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.message}</p>
              </div>
              {!a.is_resolved && (
                <button onClick={() => resolve(a.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#9B1535] hover:text-[#7A0E28] font-medium px-3 py-1.5 border border-[#BE1B3C] rounded-lg hover:bg-[#FBF0F3] transition">
                  <CheckCircle size={13} /> Resolve
                </button>
              )}
              {a.is_resolved && (
                <span className="text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded-full font-medium">Resolved</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

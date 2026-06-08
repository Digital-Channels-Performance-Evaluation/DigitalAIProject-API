"use client";
import { useState } from "react";
import { Download, FileText, Sheet } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (type: "weekly" | "monthly", format: "pdf" | "excel" | "csv") => {
    const key = `${type}-${format}`;
    setLoading(key);
    try {
      const res = await api.get(`/reports/${type}?format=${format}`, { responseType: "blob" });
      const ext = format === "excel" ? "xlsx" : format;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ahadu_${type}_report.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} report downloaded`);
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoading(null);
    }
  };

  const ReportCard = ({
    title, description, type, icon: Icon,
  }: {
    title: string; description: string;
    type: "weekly" | "monthly"; icon: React.ElementType;
  }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#FBF0F3] flex items-center justify-center">
          <Icon size={22} className="text-[#9B1535]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {(["pdf", "excel", "csv"] as const).map((fmt) => {
          const key = `${type}-${fmt}`;
          const isLoading = loading === key;
          return (
            <button
              key={fmt}
              onClick={() => download(type, fmt)}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-[#FBF0F3] hover:border-[#BE1B3C] transition text-sm disabled:opacity-60"
            >
              <span className="text-gray-700 font-medium uppercase text-xs tracking-wide">{fmt}</span>
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-[#9B1535]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <Download size={14} className="text-[#9B1535]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <Header title="Reports" subtitle="Generate and download performance reports" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-3xl">
          <ReportCard
            title="Weekly Report"
            description="Last 7 days performance summary across all digital products"
            type="weekly"
            icon={FileText}
          />
          <ReportCard
            title="Monthly Report"
            description="Last 30 days comprehensive performance analysis and insights"
            type="monthly"
            icon={FileText}
          />
        </div>

        <div className="mt-8 bg-[#FBF0F3] rounded-xl p-5 max-w-3xl border border-[#F6D9E1]">
          <h4 className="text-sm font-semibold text-[#7A0E28] mb-2">Report Contents</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {[
              "Executive summary with product performance scores and tier classification",
              "Score changes and trend analysis for all digital banking products",
              "Active alerts by severity with resolution status",
              "Top AI recommendations prioritized by impact",
              "Operational metrics: uptime, transaction success rates, user engagement",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#9B1535] mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

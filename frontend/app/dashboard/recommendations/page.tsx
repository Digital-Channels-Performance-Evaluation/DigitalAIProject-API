"use client";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

interface Recommendation {
  id: number;
  product_name: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  trigger_metric: string;
  trigger_value: number;
  ai_explanation: string;
  is_acknowledged: boolean;
  period_date: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: "border-l-4 border-[#8B1A1A]",
  high: "border-l-4 border-[#7A3A00]",
  medium: "border-l-4 border-[#7A5C00]",
  low: "border-l-4 border-[#1A4A2A]",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "text-[#8B1A1A] bg-[#FDECEA]",
  high: "text-[#7A3A00] bg-[#FFF0E6]",
  medium: "text-[#7A5C00] bg-[#FFF8E1]",
  low: "text-[#1A4A2A] bg-[#E8F5ED]",
};

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [showAck, setShowAck] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      let url = `/recommendations?limit=100`;
      if (filterPriority) url += `&priority=${filterPriority}`;
      if (!showAck) url += `&is_acknowledged=false`;
      const res = await api.get(url);
      setRecs(res.data);
    } catch {
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [filterPriority, showAck]);

  useEffect(() => { load(); }, [load]);
  useRefresh(load);

  const acknowledge = async (id: number) => {
    try {
      await api.post(`/recommendations/${id}/acknowledge`);
      toast.success("Recommendation acknowledged");
      load();
    } catch {
      toast.error("Failed to acknowledge");
    }
  };

  const filtered = recs.filter((r) =>
    !filterProduct || r.product_name.toLowerCase().includes(filterProduct.toLowerCase())
  );

  return (
    <div>
      <Header title="AI Recommendations" subtitle="Data-driven improvement recommendations for each product" />
      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#9B1535]">
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
            placeholder="Filter by product..."
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#9B1535] w-44" />
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showAck} onChange={(e) => setShowAck(e.target.checked)} className="accent-[#9B1535]" />
            Show Acknowledged
          </label>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} recommendations</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-xl border p-5 animate-pulse h-28" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400 text-sm">
            No recommendations found
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className={`bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden ${PRIORITY_STYLES[r.priority] || ""} ${r.is_acknowledged ? "opacity-60" : ""}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${PRIORITY_BADGE[r.priority] || "bg-gray-100 text-gray-600"}`}>
                          {r.priority}
                        </span>
                        <span className="text-xs text-gray-400">{r.product_name}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-[10px] text-gray-400">{r.category.replace(/_/g, " ")}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{r.title}</h3>
                      <p className="text-xs text-gray-600">{r.description}</p>

                      {r.ai_explanation && (
                        <details className="mt-3">
                          <summary className="text-xs text-[#9B1535] cursor-pointer font-medium">AI Explanation ↓</summary>
                          <pre className="text-[10px] text-gray-500 mt-2 whitespace-pre-wrap font-sans leading-relaxed bg-[#FBF0F3] p-3 rounded-lg">
                            {r.ai_explanation}
                          </pre>
                        </details>
                      )}
                    </div>
                    {!r.is_acknowledged && (
                      <button onClick={() => acknowledge(r.id)}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#9B1535] hover:text-[#7A0E28] font-medium px-3 py-1.5 border border-[#BE1B3C] rounded-lg hover:bg-[#FBF0F3] transition">
                        <CheckCircle size={13} /> Acknowledge
                      </button>
                    )}
                    {r.is_acknowledged && (
                      <span className="text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded-full font-medium flex-shrink-0">Acknowledged</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

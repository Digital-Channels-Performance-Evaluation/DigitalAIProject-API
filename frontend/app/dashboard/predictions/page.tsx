"use client";
import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Calendar, Zap, RefreshCw,
  BarChart3, Activity,
} from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { formatScore, formatCategoryName } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

interface Prediction {
  horizon_months: number;
  period_date: string;
  predicted_score: number;
  predicted_tier: string;
  confidence: number;
  trend_direction: string;
  model_version: string;
}

interface ProductPredictions {
  product_id: number;
  product_name: string;
  product_category: string;
  current_score: number | null;
  current_tier: string | null;
  predictions: Prediction[];
  loading: boolean;
  error: boolean;
}

const TIER_COLOR: Record<string, string> = {
  HIGH: "#166534", MEDIUM: "#92400E", LOW: "#991B1B",
};
const TIER_BG: Record<string, string> = {
  HIGH: "#DCFCE7", MEDIUM: "#FEF3C7", LOW: "#FEE2E2",
};

export default function PredictionsPage() {
  const [products, setProducts] = useState<ProductPredictions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const productsRes = await api.get("/products");
      const productList = productsRes.data;

      const initialData: ProductPredictions[] = productList.map((p: any) => ({
        product_id: p.id,
        product_name: p.name,
        product_category: p.category,
        current_score: p.current_score,
        current_tier: p.current_tier,
        predictions: [],
        loading: true,
        error: false,
      }));
      setProducts(initialData);
      setLoading(false);
      setRefreshing(false);

      if (productList.length === 0) return;

      // Use bulk endpoint — one request for all products
      const ids = productList.map((p: any) => p.id).join(",");
      try {
        const bulkRes = await api.get(`/ml/predictions/bulk?product_ids=${ids}`);
        const bulkData: Array<{ product_id: number; predictions: any[] }> = bulkRes.data;
        setProducts(prev =>
          prev.map(p => {
            const entry = bulkData.find(b => b.product_id === p.product_id);
            return entry
              ? { ...p, predictions: entry.predictions || [], loading: false }
              : { ...p, loading: false, error: true };
          })
        );
      } catch {
        // Fallback: mark all as errored
        setProducts(prev => prev.map(p => ({ ...p, loading: false, error: true })));
      }
    } catch {
      if (!silent) toast.error("Failed to load predictions");
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useRefresh(loadAll);

  const TrendIcon = ({ dir }: { dir: string }) => {
    if (dir === "improving") return <TrendingUp size={13} className="text-green-600" />;
    if (dir === "declining") return <TrendingDown size={13} className="text-red-600" />;
    return <Minus size={13} className="text-gray-400" />;
  };

  if (loading) {
    return (
      <div>
        <Header title="3-Month Forecasts" subtitle="AI-powered predictions for every product" />
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-52" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="3-Month Forecasts"
        subtitle="AI-powered momentum-based score predictions for all products"
      />
      <div className="p-6 space-y-5">

        {/* Summary strip */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white
                            border border-gray-100 rounded-xl px-4 py-2 shadow-card">
              <Calendar size={13} className="text-[#9B1535]" />
              <span>Showing Month 1, 2, and 3 predictions for each product</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white
                            border border-gray-100 rounded-xl px-4 py-2 shadow-card">
              <Activity size={13} className="text-[#9B1535]" />
              <span>Based on latest uploaded dataset and trained ML model</span>
            </div>
          </div>
          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-white px-3 py-2 rounded-lg
                       font-semibold transition disabled:opacity-50"
            style={{ background: refreshing ? "#9CA3AF" : "#9B1535" }}
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh All"}
          </button>
        </div>

        {/* Product prediction cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.product_id}
                 className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-gray-100"
                   style={{ background: "linear-gradient(135deg, #FBF0F3, #fff)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{p.product_name}</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatCategoryName(p.product_category)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-medium">Current</span>
                      <span className="text-xl font-black text-[#7A0E28]">
                        {formatScore(p.current_score)}
                      </span>
                    </div>
                    {p.current_tier && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: TIER_COLOR[p.current_tier],
                              background: TIER_BG[p.current_tier],
                            }}>
                        {p.current_tier}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5">
                {p.loading ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : p.error ? (
                  <div className="text-center py-6">
                    <Zap size={20} className="text-red-300 mx-auto mb-2" />
                    <p className="text-xs text-red-500 font-medium">Failed to load predictions.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Check that models are trained.</p>
                  </div>
                ) : p.predictions.length === 0 ? (
                  <div className="text-center py-6">
                    <Zap size={20} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No predictions available.</p>
                    <p className="text-[10px] text-gray-300">Upload data and run feature engineering.</p>
                  </div>
                ) : (
                  <>
                    {/* Forecast vs Current visual */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                        Current Performance
                      </span>
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-[10px] font-semibold text-[#9B1535] uppercase tracking-wide">
                        → Predicted Performance
                      </span>
                    </div>

                    {/* Month cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {p.predictions.map(pred => {
                        const tc = TIER_COLOR[pred.predicted_tier] ?? "#374151";
                        const tb = TIER_BG[pred.predicted_tier] ?? "#F9FAFB";
                        const growthPct = (p.current_score != null && p.current_score > 0)
                          ? ((pred.predicted_score - p.current_score) / p.current_score * 100)
                          : null;
                        return (
                          <div key={pred.horizon_months}
                               className="rounded-xl border p-3 text-center"
                               style={{ borderColor: `${tc}25`, background: `${tb}50` }}>
                            <div className="text-[10px] font-bold uppercase text-gray-500 mb-2">
                              Month {pred.horizon_months}
                            </div>
                            <div className="text-2xl font-black mb-1" style={{ color: tc }}>
                              {pred.predicted_score.toFixed(1)}
                            </div>
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <TrendIcon dir={pred.trend_direction} />
                              <span className="text-[10px] text-gray-500 capitalize">
                                {pred.trend_direction}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ color: tc, background: `${tc}20` }}>
                              {pred.predicted_tier}
                            </span>
                            <div className="mt-2 text-[9px] text-gray-400">
                              {(pred.confidence * 100).toFixed(0)}% conf.
                            </div>
                            {growthPct != null && growthPct !== 0 && (
                              <div className={`mt-1 text-[9px] font-semibold ${
                                growthPct > 0 ? "text-green-700" : "text-red-600"
                              }`}>
                                {growthPct > 0 ? "▲" : "▼"} {Math.abs(growthPct).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 3-month outlook */}
                    {p.predictions.length === 3 && (() => {
                      const first = p.predictions[0].predicted_score;
                      const last  = p.predictions[2].predicted_score;
                      const delta = last - (p.current_score || first);
                      const msg = delta > 3
                        ? `Score expected to rise by ${delta.toFixed(1)} pts over 3 months.`
                        : delta < -3
                        ? `Score may decline by ${Math.abs(delta).toFixed(1)} pts. Intervention needed.`
                        : `Score expected to remain stable (±${Math.abs(delta).toFixed(1)} pts).`;
                      const color = delta > 3 ? "text-green-700 bg-green-50 border-green-100"
                        : delta < -3 ? "text-red-700 bg-red-50 border-red-100"
                        : "text-gray-600 bg-gray-50 border-gray-100";
                      return (
                        <div className={`mt-3 p-2.5 rounded-xl border text-[10px] ${color}`}>
                          <BarChart3 size={10} className="inline mr-1.5" />
                          <span className="font-semibold">3-Month Outlook: </span>{msg}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Activity, Calendar, Zap, RefreshCw,
} from "lucide-react";
import Header from "@/components/layout/Header";
import TierBadge from "@/components/dashboard/TierBadge";
import PerformanceTrendChart from "@/components/charts/PerformanceTrendChart";
import api from "@/lib/api";
import { formatScore, formatCategoryName } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

/* ── Types ───────────────────────────────────────────────────────────── */
interface LatestScore {
  performance_score: number | null;
  previous_score: number | null;
  score_change: number | null;
  performance_tier: string | null;
  previous_tier: string | null;
  tier_changed: boolean;
  period_date: string | null;
  model_version: string | null;
  confidence: number | null;
}
interface ScoreHistory { date: string; value: number; }
interface Feature { [key: string]: any; }
interface Rec { id: number; priority: string; category: string; title: string; description: string; ai_explanation: string; period_date: string; }
interface SimilarProduct { product_id: number; name: string; similarity_score: number; }
interface Prediction {
  horizon_months: number; period_date: string;
  predicted_score: number; predicted_tier: string;
  confidence: number; trend_direction: string; model_version: string;
}

/* ── Colour helpers ──────────────────────────────────────────────────── */
const TIER_COLOR: Record<string, string> = { HIGH: "#166534", MEDIUM: "#92400E", LOW: "#991B1B" };
const TIER_BG:    Record<string, string> = { HIGH: "#DCFCE7", MEDIUM: "#FEF3C7", LOW: "#FEE2E2" };
const PRIORITY_BORDER: Record<string, string> = {
  critical: "border-l-4 border-red-700 bg-red-50",
  high:     "border-l-4 border-orange-600 bg-orange-50",
  medium:   "border-l-4 border-yellow-600 bg-yellow-50",
  low:      "border-l-4 border-green-700 bg-green-50",
};

/* ── Inline formatters (avoids module bugs) ──────────────────────────── */
const pct  = (v: number | null | undefined) => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const pct100 = (v: number | null | undefined) => v == null ? "—" : `${Number(v).toFixed(1)}%`;  // already 0-100

/* ════════════════════════════════════════════════════════════════════════
   Page component
═══════════════════════════════════════════════════════════════════════ */
export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id     = params?.id;
  const router = useRouter();

  /* ── State ─────────────────────────────────────────────────────────── */
  const [product,      setProduct]      = useState<any>(null);
  const [latestScore,  setLatestScore]  = useState<LatestScore | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([]);
  const [similar,      setSimilar]      = useState<SimilarProduct[]>([]);
  const [features,     setFeatures]     = useState<Feature | null>(null);
  const [recs,         setRecs]         = useState<Rec[]>([]);
  const [predictions,  setPredictions]  = useState<Prediction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [predLoading,  setPredLoading]  = useState(false);
  const [computing,    setComputing]    = useState(false);

  /* ── Fetch all product data ─────────────────────────────────────────── */
  const fetchAll = useCallback(async (isBackground = false) => {
    if (!id) return;
    if (!isBackground) setLoading(true);
    else                setRefreshing(true);

    try {
      const [prodRes, featRes, recRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get(`/data/features?product_id=${id}&limit=1`),
        api.get(`/recommendations/?product_id=${id}&limit=10`),
      ]);

      const d = prodRes.data;
      setProduct(d.product ?? null);
      setLatestScore(d.latest_score ?? null);
      setScoreHistory(
        (d.score_history ?? []).map((s: any) => ({
          date:  s.period_date,
          value: s.performance_score,
        }))
      );
      setSimilar(d.similar_products ?? []);
      setFeatures(featRes.data?.[0] ?? null);
      setRecs(recRes.data ?? []);
    } catch (err: any) {
      if (!isBackground) {
        toast.error(err?.response?.data?.detail || "Failed to load product details");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  /* ── Fetch 3-month predictions ──────────────────────────────────────── */
  const fetchPredictions = useCallback(async () => {
    if (!id) return;
    setPredLoading(true);
    try {
      const res = await api.get(`/ml/predictions/${id}`);
      setPredictions(res.data.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setPredLoading(false);
    }
  }, [id]);

  /* ── Compute score on demand ────────────────────────────────────────────── */
  const computeScore = useCallback(async () => {
    if (!id) return;
    setComputing(true);
    try {
      await api.post(`/scores/compute/${id}`);
      toast.success("Score computed successfully");
      await fetchAll(true);
      await fetchPredictions();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to compute score");
    } finally {
      setComputing(false);
    }
  }, [id, fetchAll, fetchPredictions]);

  /* ── Initial load ───────────────────────────────────────────────────── */
  useEffect(() => {
    fetchAll(false);
    fetchPredictions();
  }, [fetchAll, fetchPredictions]);

  /* ── Refresh when data is uploaded ─────────────────────────────────── */
  const handleRefresh = useCallback(() => {
    fetchAll(true);
    fetchPredictions();
  }, [fetchAll, fetchPredictions]);
  useRefresh(handleRefresh);

  /* ── Loading skeleton ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <Header title="Product Detail" subtitle="Loading..." />
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse h-32 shadow-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <Header title="Product Not Found" />
        <div className="p-6">
          <div className="bg-white rounded-xl border p-12 text-center shadow-card">
            <p className="text-gray-400 mb-4">Could not load product details.</p>
            <button onClick={() => router.back()}
                    className="text-sm px-4 py-2 rounded-lg text-white"
                    style={{ background: "#9B1535" }}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scoreChange = latestScore?.score_change ?? null;

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div>
      <Header title={product.name} subtitle={formatCategoryName(product.category)} />

      <div className="p-6 space-y-5">

        {/* Back + manual refresh */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "#9B1535" }}>
            <ArrowLeft size={15} /> Back to Products
          </button>
          <button
            onClick={() => { fetchAll(true); fetchPredictions(); }}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#9B1535]
                       transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Updating..." : "Refresh"}
          </button>
        </div>

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 text-white relative overflow-hidden"
             style={{ background: "linear-gradient(135deg, #7A0E28 0%, #9B1535 55%, #BE1B3C 100%)" }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 translate-x-24 -translate-y-24" />

          <div className="relative z-10 flex flex-wrap items-center gap-8">
            {/* Score */}
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Performance Score</p>
              <div className="text-6xl font-bold leading-none">
                {formatScore(latestScore?.performance_score)}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <TierBadge tier={latestScore?.performance_tier} />
                {!latestScore?.performance_score && (
                  <button
                    onClick={computeScore}
                    disabled={computing}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5
                               bg-white/20 hover:bg-white/30 text-white rounded-lg transition
                               disabled:opacity-50 border border-white/30"
                  >
                    {computing ? (
                      <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg> Computing...</>
                    ) : (
                      <><Zap size={11} /> Compute Score</>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="h-16 w-px bg-white/20 hidden sm:block" />

            {/* Score change */}
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Score Change</p>
              {scoreChange !== null && scoreChange !== 0 ? (
                <div className={`text-3xl font-bold flex items-center gap-2 ${
                  scoreChange > 0 ? "text-green-300" : "text-red-300"
                }`}>
                  {scoreChange > 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                  {scoreChange > 0 ? "+" : ""}{scoreChange.toFixed(1)}
                </div>
              ) : scoreChange === 0 ? (
                <div className="text-2xl font-bold text-white/50 flex items-center gap-2">
                  <Minus size={20} /> No change
                </div>
              ) : (
                <div className="text-xl font-semibold text-white/40">First period</div>
              )}
              {latestScore?.previous_score != null && (
                <p className="text-white/45 text-xs mt-1">
                  Previous: {formatScore(latestScore.previous_score)}
                </p>
              )}
            </div>

            <div className="h-16 w-px bg-white/20 hidden sm:block" />

            {/* Tier status */}
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Tier</p>
              {latestScore?.tier_changed ? (
                <div className="text-sm font-semibold text-yellow-300 bg-yellow-400/20
                                px-3 py-1.5 rounded-lg border border-yellow-300/30">
                  ⚠ {latestScore.previous_tier ?? "?"} → {latestScore.performance_tier}
                </div>
              ) : (
                <div className="text-sm font-semibold text-green-300 bg-green-400/20
                                px-3 py-1.5 rounded-lg border border-green-300/30">
                  ✓ Stable
                </div>
              )}
              <p className="text-white/40 text-[10px] mt-1.5">
                {latestScore?.period_date ? `Period: ${latestScore.period_date}` : "—"}
              </p>
            </div>

            <div className="h-16 w-px bg-white/20 hidden sm:block" />

            {/* Product meta */}
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Code</p>
              <div className="text-lg font-bold font-mono">{product.code}</div>
              <div className={`mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                product.is_active
                  ? "bg-green-400/20 text-green-300"
                  : "bg-red-400/20 text-red-300"
              }`}>
                {product.is_active ? "● Active" : "○ Inactive"}
              </div>
            </div>

            {/* Confidence */}
            {latestScore?.confidence != null && (
              <>
                <div className="h-16 w-px bg-white/20 hidden sm:block" />
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Confidence</p>
                  <div className="text-2xl font-bold">
                    {(latestScore.confidence * 100).toFixed(0)}%
                  </div>
                  <p className="text-white/40 text-[10px] mt-1">{latestScore.model_version ?? "rule-based"}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 3-Month Predictions ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} style={{ color: "#9B1535" }} />
              <h3 className="text-sm font-semibold text-gray-800">3-Month Forward Predictions</h3>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                momentum-based
              </span>
            </div>
            <button onClick={fetchPredictions} disabled={predLoading}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5
                               text-white rounded-lg transition disabled:opacity-50"
                    style={{ background: predLoading ? "#9CA3AF" : "#9B1535" }}>
              {predLoading
                ? <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg> Computing...</>
                : <><Zap size={11} /> Refresh</>
              }
            </button>
          </div>

          <div className="p-5">
            {predLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : predictions.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">
                No predictions yet — upload data and run feature engineering first.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {predictions.map(p => {
                    const tc = TIER_COLOR[p.predicted_tier] ?? "#374151";
                    const tb = TIER_BG[p.predicted_tier]   ?? "#F9FAFB";
                    return (
                      <div key={p.horizon_months}
                           className="rounded-xl border p-4"
                           style={{ borderColor: `${tc}30`, background: `${tb}60` }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-bold uppercase px-2 py-0.5
                                           rounded-full text-white"
                                style={{ background: tc }}>
                            Month {p.horizon_months}
                          </span>
                          <span className="text-[10px] text-gray-400">{p.period_date}</span>
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                          <div className="text-3xl font-black" style={{ color: tc }}>
                            {p.predicted_score.toFixed(1)}
                          </div>
                          <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-500">
                            {p.trend_direction === "improving"
                              ? <TrendingUp size={13} className="text-green-600" />
                              : p.trend_direction === "declining"
                              ? <TrendingDown size={13} className="text-red-600" />
                              : <Minus size={13} className="text-gray-400" />}
                            <span className="capitalize">{p.trend_direction}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ color: tc, background: `${tc}20` }}>
                            {p.predicted_tier}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {(p.confidence * 100).toFixed(0)}% conf.
                          </span>
                        </div>
                        <div className="mt-2.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                               style={{ width: `${p.confidence * 100}%`, background: tc }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {predictions.length === 3 && (() => {
                  const currentScore = latestScore?.performance_score ?? predictions[0].predicted_score;
                  const s2    = predictions[2].predicted_score;
                  const delta = s2 - currentScore;
                  const msg = delta > 3
                    ? `Improving — score expected to rise by ${delta.toFixed(1)} pts over 3 months.`
                    : delta < -3
                    ? `Declining — score may fall by ${Math.abs(delta).toFixed(1)} pts. Action needed.`
                    : `Stable — score stays within ${Math.abs(delta).toFixed(1)} pt(s) of current level.`;
                  return (
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600">
                      <span className="font-semibold text-gray-800">3-Month Outlook: </span>{msg}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* ── Score history chart + Feature analysis ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceTrendChart data={scoreHistory} title="Score History (12 Months)" />

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={15} style={{ color: "#9B1535" }} />
              <h3 className="text-sm font-semibold text-gray-800">Latest Feature Analysis</h3>
              {refreshing && (
                <span className="ml-auto text-[10px] text-gray-400 animate-pulse">updating…</span>
              )}
            </div>
            {features ? (
              <div className="space-y-2.5">
                {[
                  {
                    label: "Active User Rate",
                    val: pct(features.active_user_rate),
                    good: (features.active_user_rate ?? 0) >= 0.5,
                  },
                  {
                    label: "Transaction Success Rate",
                    val: pct(features.transaction_success_rate),
                    good: (features.transaction_success_rate ?? 0) >= 0.9,
                  },
                  {
                    label: "Operational Efficiency",
                    // stored 0-100
                    val: features.operational_efficiency_score != null
                      ? `${Number(features.operational_efficiency_score).toFixed(1)}%` : "—",
                    good: (features.operational_efficiency_score ?? 0) >= 75,
                  },
                  {
                    label: "Downtime Impact",
                    // stored 0-100
                    val: features.downtime_impact_score != null
                      ? `${Number(features.downtime_impact_score).toFixed(3)}%` : "—",
                    good: (features.downtime_impact_score ?? 100) <= 2,
                  },
                  {
                    label: "Complaint Growth Rate",
                    // stored as % (MoM change)
                    val: features.complaint_growth_rate != null
                      ? `${Number(features.complaint_growth_rate).toFixed(1)}%` : "—",
                    good: (features.complaint_growth_rate ?? 100) <= 5,
                  },
                  {
                    label: "Complaint Resolution Rate",
                    // stored 0-100 already
                    val: pct100(features.complaint_resolution_rate),
                    good: (features.complaint_resolution_rate ?? 0) >= 70,
                  },
                  {
                    label: "Revenue / Active User",
                    val: features.revenue_per_active_user != null
                      ? `ETB ${Number(features.revenue_per_active_user).toLocaleString("en-ET", { maximumFractionDigits: 0 })}` : "—",
                    good: (features.revenue_per_active_user ?? 0) >= 10,
                  },
                  {
                    label: "CSAT Score",
                    val: features.csat_score != null
                      ? `${Number(features.csat_score).toFixed(2)} / 5.0` : "—",
                    good: (features.csat_score ?? 0) >= 3.5,
                  },
                  {
                    label: "API Error Rate",
                    val: features.api_error_rate != null
                      ? `${Number(features.api_error_rate).toFixed(2)}%` : "—",
                    good: (features.api_error_rate ?? 100) <= 3,
                  },
                  {
                    label: "Fraud Events",
                    val: features.fraud_event_count != null
                      ? String(features.fraud_event_count) : "—",
                    good: (features.fraud_event_count ?? 100) <= 5,
                  },
                  {
                    label: "Failed Txn Rate",
                    val: features.failed_txn_rate_pct != null
                      ? `${Number(features.failed_txn_rate_pct).toFixed(2)}%` : "—",
                    good: (features.failed_txn_rate_pct ?? 100) <= 5,
                  },
                ].map(item => (
                  <div key={item.label}
                       className="flex items-center justify-between text-xs py-1
                                  border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{item.label}</span>
                    <span className={`font-semibold tabular-nums ${item.good ? "text-green-700" : "text-red-600"}`}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-gray-400">No feature data available.</p>
                <p className="text-xs text-gray-300 mt-1">Run feature engineering to populate.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recommendations + Similar Products ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recommendations */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "#9B1535" }} />
              <h3 className="text-sm font-semibold text-gray-800">AI Recommendations</h3>
              {recs.length > 0 && (
                <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ background: "#9B1535" }}>
                  {recs.length}
                </span>
              )}
              {refreshing && (
                <span className="text-[10px] text-gray-400 animate-pulse ml-1">updating…</span>
              )}
            </div>
            <div className="p-5 space-y-3">
              {recs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm text-gray-400">No active recommendations.</p>
                  <p className="text-xs text-gray-300 mt-1">All key metrics within acceptable ranges.</p>
                </div>
              ) : recs.map(r => (
                <div key={r.id}
                     className={`p-3.5 rounded-xl text-xs ${PRIORITY_BORDER[r.priority] ?? "bg-gray-50"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold uppercase text-[10px] tracking-wide
                                     px-2 py-0.5 rounded-full bg-white/60">
                      {r.priority}
                    </span>
                    <span className="text-gray-500 capitalize">
                      {r.category?.replace(/_/g, " ")}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400">{r.period_date}</span>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">{r.title}</p>
                  <p className="text-gray-600 leading-relaxed">{r.description}</p>
                  {r.ai_explanation && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
                        AI explanation ▸
                      </summary>
                      <p className="mt-1 text-[10px] text-gray-400 italic leading-relaxed whitespace-pre-line">
                        {r.ai_explanation}
                      </p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Similar products + prediction mini-summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "#9B1535" }} />
              <h3 className="text-sm font-semibold text-gray-800">Similar Products</h3>
            </div>
            <div className="p-5 flex-1">
              {similar.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No similar products.<br />
                  <span className="text-gray-300">Train the KNN Similarity model first.</span>
                </p>
              ) : similar.map(s => (
                <div key={s.product_id}
                     className="flex items-center justify-between py-3 border-b border-gray-50
                                last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition"
                     onClick={() => router.push(`/dashboard/products/${s.product_id}`)}>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">KNN peer product</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#9B1535" }}>
                    {(s.similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-gray-300 mt-3 text-center">Based on KNN similarity model</p>
            </div>

            {/* Prediction mini-summary */}
            {predictions.length === 3 && (
              <div className="px-5 pb-5">
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Score Forecast
                  </p>
                  <div className="space-y-1.5">
                    {predictions.map(p => (
                      <div key={p.horizon_months}
                           className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Month {p.horizon_months}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold tabular-nums"
                                style={{ color: TIER_COLOR[p.predicted_tier] ?? "#374151" }}>
                            {p.predicted_score.toFixed(1)}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{
                                  color:      TIER_COLOR[p.predicted_tier],
                                  background: TIER_BG[p.predicted_tier],
                                }}>
                            {p.predicted_tier}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

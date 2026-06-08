"use client";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/layout/Header";
import TierBadge from "@/components/dashboard/TierBadge";
import api from "@/lib/api";
import { formatScore } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

interface Score {
  id: number;
  product_id: number;
  period_date: string;
  performance_score: number;
  previous_score: number | null;
  score_change: number | null;
  performance_tier: string;
  tier_changed: boolean;
  model_version: string | null;
  confidence: number | null;
  created_at: string;
}

export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [products, setProducts] = useState<Record<number, string>>({});
  const [filterProduct, setFilterProduct] = useState<number | "">(""); 
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [scoresRes, productsRes] = await Promise.all([
        api.get("/scores?limit=100"),
        api.get("/products"),
      ]);
      setScores(scoresRes.data);
      const pMap: Record<number, string> = {};
      productsRes.data.forEach((p: any) => { pMap[p.id] = p.name; });
      setProducts(pMap);
    } catch {
      toast.error("Failed to load scores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefresh(load);

  const filtered = filterProduct
    ? scores.filter((s) => s.product_id === Number(filterProduct))
    : scores;

  return (
    <div>
      <Header title="Performance Scores" subtitle="Historical scoring for all digital banking products" />
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value === "" ? "" : Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#9B1535]"
          >
            <option value="">All Products</option>
            {Object.entries(products).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} records</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FBF0F3]">
                {["Product", "Period", "Score", "Tier", "Change", "Tier Changed", "Model", "Confidence"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-[#7A0E28] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>{Array(8).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{products[s.product_id] || `Product ${s.product_id}`}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.period_date}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-[#7A0E28]">{formatScore(s.performance_score)}</span>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={s.performance_tier} size="sm" /></td>
                  <td className={`px-4 py-3 text-xs font-medium ${s.score_change == null ? "text-gray-300" : s.score_change > 0 ? "text-green-700" : s.score_change < 0 ? "text-red-700" : "text-gray-400"}`}>
                    {s.score_change !== null ? `${s.score_change > 0 ? "+" : ""}${s.score_change.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.tier_changed ? (
                      <span className="text-[10px] font-medium text-[#7A5C00] bg-[#FFF8E1] px-2 py-0.5 rounded-full">Changed</span>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">{s.model_version || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.confidence ? `${(s.confidence * 100).toFixed(0)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

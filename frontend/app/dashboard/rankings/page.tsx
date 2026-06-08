"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Header from "@/components/layout/Header";
import TierBadge from "@/components/dashboard/TierBadge";
import api from "@/lib/api";
import { formatScore, formatCategoryName } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

interface Ranking {
  rank: number;
  product_id: number;
  product_name: string;
  product_category: string;
  performance_score: number;
  performance_tier: string;
  score_change: number | null;
  trend: string;
  recommendation_count: number;
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/rankings");
      setRankings(res.data);
    } catch {
      toast.error("Failed to load rankings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefresh(load);

  const rankBg = (rank: number) => {
    if (rank === 1) return "bg-[#7A0E28] text-white";
    if (rank === 2) return "bg-[#9B1535] text-white";
    if (rank === 3) return "bg-[#BE1B3C] text-white";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div>
      <Header title="Product Rankings" subtitle="Products ranked by current performance score" />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FBF0F3]">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Rank</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Product</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Score</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Tier</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Change</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Trend</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Pending Recs</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-[#7A0E28] uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : rankings.map((r) => (
                <tr key={r.product_id} className="hover:bg-[#FBF0F3] transition">
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${rankBg(r.rank)}`}>
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-gray-900">{r.product_name}</div>
                    <div className="text-xs text-gray-400">{formatCategoryName(r.product_category)}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-8 bg-[#FBF0F3] rounded-lg">
                      <span className="text-sm font-bold text-[#7A0E28]">{formatScore(r.performance_score)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center"><TierBadge tier={r.performance_tier} size="sm" /></td>
                  <td className={`px-5 py-4 text-center text-sm font-medium ${r.score_change == null ? "text-gray-300" : r.score_change > 0 ? "text-green-700" : r.score_change < 0 ? "text-red-700" : "text-gray-400"}`}>
                    {r.score_change !== null ? `${r.score_change > 0 ? "+" : ""}${r.score_change.toFixed(1)}` : "—"}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {r.trend === "up" ? <TrendingUp size={16} className="text-green-600 mx-auto" /> :
                     r.trend === "down" ? <TrendingDown size={16} className="text-red-600 mx-auto" /> :
                     <Minus size={16} className="text-gray-400 mx-auto" />}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {r.recommendation_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-[#FFF8E1] text-[#7A5C00] rounded-full">
                        {r.recommendation_count}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Link href={`/dashboard/products/${r.product_id}`}
                      className="text-xs text-[#9B1535] hover:text-[#7A0E28] font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

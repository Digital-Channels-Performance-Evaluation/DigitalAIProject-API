"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import TierBadge from "@/components/dashboard/TierBadge";
import api from "@/lib/api";
import { formatScore, formatCategoryName } from "@/lib/utils";
import { useRefresh } from "@/lib/use-refresh";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  code: string;
  category: string;
  description: string;
  is_active: boolean;
  current_score: number | null;
  current_tier: string | null;
  score_change: number | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefresh(load);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Products" subtitle="Digital banking product performance overview" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#9B1535] w-60"
            />
          </div>
          <div className="text-xs text-gray-500">{filtered.length} products</div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link key={p.id} href={`/dashboard/products/${p.id}`}>
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card hover:shadow-card-hover transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#9B1535] transition">{p.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{formatCategoryName(p.category)}</p>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-[#9B1535] transition mt-0.5" />
                  </div>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-[#7A0E28]">{formatScore(p.current_score)}</div>
                      <div className="text-[10px] text-gray-400">Performance Score</div>
                    </div>
                    <div className="text-right">
                      <TierBadge tier={p.current_tier} />
                      {p.score_change !== null && (
                        <div className={`text-xs mt-1 font-medium ${p.score_change > 0 ? "text-green-700" : p.score_change < 0 ? "text-red-700" : "text-gray-400"}`}>
                          {p.score_change > 0 ? "+" : ""}{p.score_change?.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

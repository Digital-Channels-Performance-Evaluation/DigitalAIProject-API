"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface TrendPoint {
  date: string;
  value: number;
  product_name?: string;
}

interface PerformanceTrendChartProps {
  data: TrendPoint[];
  title?: string;
}

function aggregateByDate(data: TrendPoint[]) {
  const map: Record<string, { total: number; count: number }> = {};
  data.forEach((d) => {
    const key = (d.date || "").slice(0, 7);
    if (!key) return;
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += Number(d.value) || 0;
    map[key].count += 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, count }]) => ({
      date,
      score: Math.round((total / count) * 10) / 10,
    }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const tier = score >= 80 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
  const tierColor = score >= 80 ? "#166534" : score >= 50 ? "#92400E" : "#991B1B";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xl text-xs min-w-[130px]">
      <p className="font-semibold text-gray-600 mb-2">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-500">Avg Score</span>
        <span className="font-bold text-lg" style={{ color: "#9B1535" }}>{score}</span>
      </div>
      <div className="mt-1 text-center">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: tierColor, background: `${tierColor}18` }}>
          {tier}
        </span>
      </div>
    </div>
  );
};

export default function PerformanceTrendChart({ data, title }: PerformanceTrendChartProps) {
  const chartData = aggregateByDate(data);
  const hasData = chartData.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          )}
          <p className="text-[10px] text-gray-400 mt-0.5">Monthly average across all products</p>
        </div>
        {hasData && (
          <div className="text-right">
            <div className="text-xl font-black" style={{ color: "#9B1535" }}>
              {chartData[chartData.length - 1]?.score}
            </div>
            <div className="text-[9px] text-gray-400 uppercase tracking-wide">Latest</div>
          </div>
        )}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[200px] gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: "#FBF0F3" }}>
            <span className="text-lg">📊</span>
          </div>
          <p className="text-xs text-gray-400">No performance data yet</p>
          <p className="text-[10px] text-gray-300">Data appears after scoring runs</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#9B1535" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#9B1535" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="#166534" strokeDasharray="4 4"
                           strokeOpacity={0.4} label={{ value: "HIGH", position: "right", fontSize: 9, fill: "#166534" }} />
            <ReferenceLine y={50} stroke="#92400E" strokeDasharray="4 4"
                           strokeOpacity={0.4} label={{ value: "MED", position: "right", fontSize: 9, fill: "#92400E" }} />
            <Area
              type="monotone"
              dataKey="score"
              name="Avg Score"
              stroke="#9B1535"
              strokeWidth={2.5}
              fill="url(#scoreGrad)"
              dot={{ fill: "#9B1535", r: 3, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 5, fill: "#7A0E28", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

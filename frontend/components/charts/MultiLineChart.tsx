"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  value: number;
  product_name?: string;
  product_id?: number;
}

interface MultiLineChartProps {
  data: DataPoint[];
  title: string;
  valueLabel?: string;
}

// Distinct palette — crimson family + supporting colors
const COLORS = [
  "#9B1535", // crimson
  "#2563EB", // blue
  "#059669", // green
  "#D97706", // amber
  "#7C3AED", // purple
  "#0891B2", // cyan
  "#DC2626", // red
];

// Product short names for legend readability
function shortName(name: string): string {
  return name
    .replace("Ahadu ", "")
    .replace("Banking", "Bank")
    .replace("Network", "Net")
    .replace("System", "Sys")
    .replace("Digital Wallet", "Wallet");
}

function groupByProduct(data: DataPoint[]) {
  const map: Record<string, Record<string, number>> = {};
  const productSet: Set<string> = new Set();

  data.forEach((d) => {
    const name = d.product_name || (d.product_id ? `Product ${d.product_id}` : null);
    if (!name || !d.date) return;
    const month = d.date.slice(0, 7);
    if (!month) return;
    productSet.add(name);
    if (!map[month]) map[month] = {};
    map[month][name] = Number(d.value) || 0;
  });

  const products = Array.from(productSet).sort();
  const chartData = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  return { chartData, products };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xl text-xs
                    min-w-[160px] max-w-[220px]">
      <p className="font-semibold text-gray-600 mb-2 pb-1.5 border-b border-gray-100">{label}</p>
      <div className="space-y-1">
        {payload
          .sort((a: any, b: any) => b.value - a.value)
          .map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                     style={{ background: p.color }} />
                <span className="text-gray-500 truncate text-[10px]">
                  {shortName(p.name)}
                </span>
              </div>
              <span className="font-semibold flex-shrink-0" style={{ color: p.color }}>
                {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

const CustomLegend = ({ payload }: any) => {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1">
          <div className="w-3 h-0.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-[10px] text-gray-500">{shortName(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function MultiLineChart({ data, title }: MultiLineChartProps) {
  const { chartData, products } = groupByProduct(data);
  const hasData = chartData.length > 0 && products.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {hasData && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {products.length} product{products.length > 1 ? "s" : ""} · {chartData.length} periods
          </p>
        )}
      </div>

      {/* Chart or empty state */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[200px] gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: "#FBF0F3" }}>
            <span className="text-lg">📈</span>
          </div>
          <p className="text-xs text-gray-400">No data available yet</p>
          <p className="text-[10px] text-gray-300">Upload data to see trends</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` :
                v >= 1_000     ? `${(v / 1_000).toFixed(0)}K` : String(v)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            {products.slice(0, 7).map((p, i) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TierDistributionChartProps {
  high: number;
  medium: number;
  low: number;
}

const COLORS = { HIGH: "#2D5A27", MEDIUM: "#7A5C00", LOW: "#8B1A1A" };

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-md text-xs">
      <p className="font-medium">{payload[0].name}: {payload[0].value} products</p>
    </div>
  );
};

export default function TierDistributionChart({ high, medium, low }: TierDistributionChartProps) {
  const data = [
    { name: "HIGH", value: high, color: COLORS.HIGH },
    { name: "MEDIUM", value: medium, color: COLORS.MEDIUM },
    { name: "LOW", value: low, color: COLORS.LOW },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
      No tier data available
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

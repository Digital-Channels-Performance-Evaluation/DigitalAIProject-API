import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';

const FEATURE_LABELS = {
  user_growth_rate: 'User Growth Rate',
  transaction_growth_rate: 'Txn Growth Rate',
  revenue_growth_rate: 'Revenue Growth Rate',
  failure_rate: 'Failure Rate',
  complaints_per_1000_users: 'Complaints / 1k Users',
  uptime_percentage: 'Uptime %',
  active_user_ratio: 'Active User Ratio',
  retention_rate: 'Retention Rate',
  revenue_per_user: 'Revenue / User',
  transaction_value_per_user: 'Txn Value / User',
  transaction_volume_7d_avg: '7d Txn Volume Avg',
  revenue_7d_avg: '7d Revenue Avg',
  fraud_rate: 'Fraud Rate',
  operational_risk_score: 'Operational Risk',
};

const GRADIENT_COLORS = [
  '#6366f1', '#7c3aed', '#06b6d4', '#0891b2',
  '#10b981', '#059669', '#f59e0b', '#d97706',
  '#ef4444', '#dc2626', '#8b5cf6', '#7c3aed',
  '#ec4899', '#db2777',
];

export default function FeatureImportanceChart({ importance }) {
  if (!importance || Object.keys(importance).length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Feature importance not available
        </Typography>
      </Box>
    );
  }

  const data = Object.entries(importance)
    .map(([key, value]) => ({
      feature: FEATURE_LABELS[key] || key,
      importance: parseFloat((value * 100).toFixed(2)),
      raw: key,
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 12); // top 12

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
        Top Feature Importances
      </Typography>
      <ResponsiveContainer width="100%" height={data.length * 36 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            dataKey="feature"
            type="category"
            tick={{ fill: '#e2e8f0', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={160}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1d27',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [`${v}%`, 'Importance']}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry, index) => (
              <Cell
                key={entry.raw}
                fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

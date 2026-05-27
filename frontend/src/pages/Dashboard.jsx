import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Box, Paper, Typography, List, ListItem, ListItemText,
  Skeleton, Divider, Button, LinearProgress,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import PsychologyIcon from '@mui/icons-material/Psychology';
import InsightsIcon from '@mui/icons-material/Insights';
import DevicesIcon from '@mui/icons-material/Devices';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { getKPIs, getPredictionDistribution, getModelComparison, getRecentActivity, getChannelRanking } from '../api/endpoints';

const TIER_COLORS = {
  Excellent: '#10b981',
  Good: '#6366f1',
  Average: '#f59e0b',
  Poor: '#ef4444',
};

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [modelComparison, setModelComparison] = useState([]);
  const [activity, setActivity] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [kpiRes, distRes, modRes, actRes, rankRes] = await Promise.all([
          getKPIs(),
          getPredictionDistribution(),
          getModelComparison(),
          getRecentActivity(8),
          getChannelRanking(),
        ]);
        setKpis(kpiRes.data);
        setDistribution(distRes.data);
        setModelComparison(modRes.data);
        setActivity(actRes.data);
        setRanking(rankRes.data || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          {
            title: 'Total Datasets',
            value: kpis?.total_datasets,
            icon: <StorageIcon />,
            color: '#6366f1',
            subtitle: 'Uploaded & processed',
          },
          {
            title: 'Channels Tracked',
            value: kpis?.total_products,
            icon: <DevicesIcon />,
            color: '#06b6d4',
            subtitle: 'Unique product IDs',
          },
          {
            title: 'Models Trained',
            value: kpis?.models_trained,
            icon: <PsychologyIcon />,
            color: '#10b981',
            subtitle: kpis?.avg_model_accuracy
              ? `Avg accuracy: ${(kpis.avg_model_accuracy * 100).toFixed(1)}%`
              : 'No models yet',
          },
          {
            title: 'Total Predictions',
            value: kpis?.total_predictions?.toLocaleString(),
            icon: <InsightsIcon />,
            color: '#f59e0b',
            subtitle: 'Across all models',
          },
        ].map((card) => (
          <Grid item xs={12} sm={6} lg={3} key={card.title}>
            <StatCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Prediction Distribution Pie */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: 340 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Performance Distribution
            </Typography>
            {distribution.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No predictions yet
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                    label={({ label, percent }) =>
                      `${label} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {distribution.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={TIER_COLORS[entry.label] || '#6366f1'}
                      />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Model Comparison Bar */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: 340 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Model Performance Comparison
            </Typography>
            {modelComparison.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No trained models yet
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={modelComparison} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="model_type"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <RTooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    formatter={(v) => `${(v * 100).toFixed(1)}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  <Bar dataKey="accuracy" name="Accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="f1_score" name="F1 Score" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Channel Ranking Widget */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LeaderboardIcon sx={{ color: 'primary.light' }} />
                <Typography variant="h6">Channel Rankings</Typography>
              </Box>
              <Button
                size="small" endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/ranking')}
                sx={{ fontSize: '0.75rem' }}
              >
                Full Ranking
              </Button>
            </Box>

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="text" height={44} sx={{ mb: 0.5 }} />
              ))
            ) : ranking.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No ranking data yet — run predictions first
                </Typography>
              </Box>
            ) : (
              <Box>
                {ranking.slice(0, 6).map((ch, idx) => (
                  <React.Fragment key={ch.product_id}>
                    {idx > 0 && <Divider sx={{ borderColor: 'divider' }} />}
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      py: 1.25, px: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                    }}>
                      {/* Rank */}
                      <Typography sx={{
                        minWidth: 28, fontWeight: 800, fontSize: '0.85rem',
                        color: idx < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][idx] : 'text.secondary',
                        textAlign: 'center',
                      }}>
                        {idx < 3 ? MEDAL[idx] : `#${ch.rank}`}
                      </Typography>

                      {/* Channel name */}
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', minWidth: 160 }}>
                        {ch.product_id}
                      </Typography>

                      {/* Score bar */}
                      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={ch.score}
                          sx={{
                            flexGrow: 1, height: 6, borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.06)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: TIER_COLORS[ch.performance_tier],
                              borderRadius: 3,
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: TIER_COLORS[ch.performance_tier], minWidth: 30 }}>
                          {ch.score}
                        </Typography>
                      </Box>

                      {/* Tier badge */}
                      <Box sx={{ minWidth: 80, textAlign: 'right' }}>
                        <StatusBadge status={ch.performance_tier} />
                      </Box>

                      {/* Trend */}
                      <Box sx={{ minWidth: 20 }}>
                        {ch.trend === 1  && <TrendingUpIcon   sx={{ fontSize: 16, color: 'success.main' }} />}
                        {ch.trend === -1 && <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main'   }} />}
                        {ch.trend === 0  && <TrendingFlatIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                      </Box>
                    </Box>
                  </React.Fragment>
                ))}

                {ranking.length > 6 && (
                  <Box sx={{ pt: 1.5, textAlign: 'center' }}>
                    <Button size="small" onClick={() => navigate('/ranking')} endIcon={<ArrowForwardIcon />}>
                      View all {ranking.length} channels
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Activity
            </Typography>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="text" height={40} sx={{ mb: 0.5 }} />
              ))
            ) : activity.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No activity yet
              </Typography>
            ) : (
              <List disablePadding>
                {activity.map((item, idx) => (
                  <React.Fragment key={`${item.type}-${item.id}`}>
                    {idx > 0 && <Divider sx={{ borderColor: 'divider' }} />}
                    <ListItem disablePadding sx={{ py: 1 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: item.type === 'upload' ? 'rgba(99,102,241,0.15)' : 'rgba(6,182,212,0.15)',
                                color: item.type === 'upload' ? 'primary.light' : 'secondary.light',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '0.65rem',
                              }}
                            >
                              {item.type}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {item.label}
                            </Typography>
                            <StatusBadge status={item.status} />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

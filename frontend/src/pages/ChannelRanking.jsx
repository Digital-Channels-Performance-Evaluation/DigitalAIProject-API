import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Tooltip, LinearProgress, ToggleButtonGroup, ToggleButton,
  Divider,
} from '@mui/material';
import SearchIcon        from '@mui/icons-material/Search';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon  from '@mui/icons-material/TrendingFlat';
import EmojiEventsIcon   from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon   from '@mui/icons-material/Leaderboard';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList,
  Tooltip as RTooltip,
} from 'recharts';
import { listModels, getChannelRanking } from '../api/endpoints';
import SectionHeader from '../components/common/SectionHeader';
import StatusBadge   from '../components/common/StatusBadge';

// ── Constants ─────────────────────────────────────────────────────────────────
const TIER_COLORS  = { Excellent: '#10b981', Good: '#6366f1', Average: '#f59e0b', Poor: '#ef4444' };
const TIER_ORDER   = { Excellent: 1, Good: 2, Average: 3, Poor: 4 };
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const RANK_BG = {
  Excellent: 'rgba(16,185,129,0.06)',
  Good:      'rgba(99,102,241,0.06)',
  Average:   'rgba(245,158,11,0.06)',
  Poor:      'rgba(239,68,68,0.06)',
};

function TrendIcon({ trend }) {
  if (trend === 1)  return <TrendingUpIcon   sx={{ fontSize: 16, color: 'success.main' }} />;
  if (trend === -1) return <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main'   }} />;
  return               <TrendingFlatIcon  sx={{ fontSize: 16, color: 'text.secondary' }} />;
}

function MedalBadge({ rank }) {
  if (rank > 3) return (
    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 28, textAlign: 'center' }}>
      #{rank}
    </Typography>
  );
  return (
    <Box sx={{
      width: 28, height: 28, borderRadius: '50%',
      bgcolor: MEDAL_COLORS[rank - 1] + '22',
      border: `2px solid ${MEDAL_COLORS[rank - 1]}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: MEDAL_COLORS[rank - 1] }}>
        {rank}
      </Typography>
    </Box>
  );
}

function ScoreBar({ score, tier }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          flexGrow: 1, height: 8, borderRadius: 4,
          bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': {
            bgcolor: TIER_COLORS[tier] || '#6366f1',
            borderRadius: 4,
          },
        }}
      />
      <Typography variant="caption" sx={{ fontWeight: 700, color: TIER_COLORS[tier], minWidth: 32 }}>
        {score}
      </Typography>
    </Box>
  );
}

function TierBreakdownMini({ breakdown }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (!total) return null;
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {['Excellent', 'Good', 'Average', 'Poor'].map(t => {
        const pct = Math.round((breakdown[t] / total) * 100);
        if (!pct) return null;
        return (
          <Tooltip key={t} title={`${t}: ${breakdown[t]} (${pct}%)`}>
            <Box sx={{
              height: 6, width: `${Math.max(pct * 0.6, 4)}px`,
              bgcolor: TIER_COLORS[t], borderRadius: 1,
            }} />
          </Tooltip>
        );
      })}
    </Box>
  );
}

// ── Top-3 Podium ──────────────────────────────────────────────────────────────
function Podium({ channels }) {
  if (channels.length < 1) return null;
  const order = [1, 0, 2].map(i => channels[i]).filter(Boolean); // 2nd, 1st, 3rd

  const heights = [80, 110, 60];
  const labels  = ['2nd', '1st', '3rd'];

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, py: 2 }}>
      {order.map((ch, i) => (
        <Box key={ch.product_id} sx={{ textAlign: 'center', minWidth: 100 }}>
          {i === 1 && (
            <EmojiEventsIcon sx={{ fontSize: 32, color: '#FFD700', mb: 0.5 }} />
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {ch.product_id}
          </Typography>
          <Chip
            label={ch.performance_tier}
            size="small"
            sx={{
              bgcolor: TIER_COLORS[ch.performance_tier] + '22',
              color: TIER_COLORS[ch.performance_tier],
              fontWeight: 700, fontSize: '0.65rem', mb: 0.5,
            }}
          />
          <Box sx={{
            height: heights[i],
            bgcolor: TIER_COLORS[ch.performance_tier] + '30',
            border: `2px solid ${TIER_COLORS[ch.performance_tier]}`,
            borderRadius: '8px 8px 0 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: TIER_COLORS[ch.performance_tier] }}>
              {ch.score}
            </Typography>
          </Box>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.06)', py: 0.5,
            borderRadius: '0 0 4px 4px',
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {labels[i]}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChannelRanking() {
  const [models,    setModels]    = useState([]);
  const [modelId,   setModelId]   = useState('');
  const [ranking,   setRanking]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [tierFilter,setTierFilter]= useState('All');
  const [view,      setView]      = useState('table'); // 'table' | 'chart'

  // Load models on mount
  useEffect(() => {
    listModels().then(r => {
      const ready = (r.data || []).filter(m => m.status === 'ready');
      setModels(ready);
      if (ready.length > 0) setModelId(ready[0].id);
    }).catch(() => {});
  }, []);

  // Load ranking when model changes
  useEffect(() => {
    if (!modelId) { setLoading(false); return; }
    setLoading(true);
    getChannelRanking(modelId)
      .then(r => setRanking(r.data || []))
      .catch(() => setRanking([]))
      .finally(() => setLoading(false));
  }, [modelId]);

  // Filtered + searched list
  const filtered = useMemo(() => {
    return ranking.filter(ch => {
      const matchSearch = !search || ch.product_id.toLowerCase().includes(search.toLowerCase());
      const matchTier   = tierFilter === 'All' || ch.performance_tier === tierFilter;
      return matchSearch && matchTier;
    });
  }, [ranking, search, tierFilter]);

  // Summary counts
  const tierCounts = useMemo(() => {
    const c = { Excellent: 0, Good: 0, Average: 0, Poor: 0 };
    ranking.forEach(ch => { if (c[ch.performance_tier] !== undefined) c[ch.performance_tier]++; });
    return c;
  }, [ranking]);

  // Bar chart data (top 10 by score)
  const barData = useMemo(() =>
    ranking.slice(0, 10).map(ch => ({
      name: ch.product_id.replace(/_/g, ' '),
      score: ch.score,
      tier: ch.performance_tier,
    })), [ranking]);

  return (
    <Box>
      <SectionHeader
        title="Channel Ranking"
        subtitle="ML-powered performance ranking of all digital channels"
      />

      {/* Model selector */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Model</InputLabel>
              <Select value={modelId} label="Select Model"
                onChange={e => setModelId(e.target.value)}>
                {models.length === 0 && <MenuItem disabled value="">No ready models</MenuItem>}
                {models.map(m => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} — {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}% acc` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={5}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['All', 'Excellent', 'Good', 'Average', 'Poor'].map(t => (
                <Chip
                  key={t}
                  label={t === 'All' ? `All (${ranking.length})` : `${t} (${tierCounts[t] || 0})`}
                  onClick={() => setTierFilter(t)}
                  size="small"
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    bgcolor: tierFilter === t
                      ? (t === 'All' ? 'primary.dark' : TIER_COLORS[t] + '33')
                      : 'rgba(255,255,255,0.05)',
                    color: tierFilter === t
                      ? (t === 'All' ? 'primary.light' : TIER_COLORS[t])
                      : 'text.secondary',
                    border: `1px solid ${tierFilter === t
                      ? (t === 'All' ? '#6366f1' : TIER_COLORS[t])
                      : 'transparent'}`,
                  }}
                />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small"
              placeholder="Search channel…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : ranking.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center' }}>
          <LeaderboardIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No ranking data yet. Run predictions first.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>

          {/* ── Left: Podium + Score Bar Chart ─────────────────────────── */}
          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Top Performers</Typography>
              <Podium channels={ranking.slice(0, 3)} />
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Score Overview (Top 10)</Typography>
              <ResponsiveContainer width="100%" height={ranking.slice(0,10).length * 38 + 20}>
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 0, right: 50, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={130}
                    tick={{ fill: '#e2e8f0', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RTooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    formatter={(v, n, p) => [`${v} / 100`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="score" position="right"
                      style={{ fill: '#94a3b8', fontSize: 11 }} />
                    {barData.map(entry => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* ── Right: Full Ranking Table ───────────────────────────────── */}
          <Grid item xs={12} lg={7}>
            <Paper sx={{ p: 0, overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  Full Rankings
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    {filtered.length} channel{filtered.length !== 1 ? 's' : ''}
                  </Typography>
                </Typography>
                <ToggleButtonGroup
                  value={view} exclusive size="small"
                  onChange={(_, v) => v && setView(v)}
                  sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1.5, fontSize: '0.7rem' } }}
                >
                  <ToggleButton value="table">Table</ToggleButton>
                  <ToggleButton value="cards">Cards</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Divider />

              {view === 'table' ? (
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 50 }}>Rank</TableCell>
                        <TableCell>Channel</TableCell>
                        <TableCell>Tier</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Breakdown</TableCell>
                        <TableCell sx={{ width: 40 }}>Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map(ch => (
                        <TableRow
                          key={ch.product_id}
                          hover
                          sx={{ bgcolor: RANK_BG[ch.performance_tier] }}
                        >
                          <TableCell>
                            <MedalBadge rank={ch.rank} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                              {ch.product_id}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {ch.total_predictions} predictions
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ch.performance_tier} />
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <ScoreBar score={ch.score} tier={ch.performance_tier} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {(ch.confidence * 100).toFixed(0)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TierBreakdownMini breakdown={ch.tier_breakdown} />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={ch.trend === 1 ? 'Improving' : ch.trend === -1 ? 'Declining' : 'Stable'}>
                              <Box><TrendIcon trend={ch.trend} /></Box>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                /* Cards view */
                <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 2, maxHeight: 600, overflow: 'auto' }}>
                  {filtered.map(ch => (
                    <Box
                      key={ch.product_id}
                      sx={{
                        width: 'calc(50% - 8px)',
                        minWidth: 180,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${TIER_COLORS[ch.performance_tier]}33`,
                        bgcolor: RANK_BG[ch.performance_tier],
                        position: 'relative',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <MedalBadge rank={ch.rank} />
                        <TrendIcon trend={ch.trend} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', mb: 0.5 }}>
                        {ch.product_id}
                      </Typography>
                      <StatusBadge status={ch.performance_tier} />
                      <Box sx={{ mt: 1.5 }}>
                        <ScoreBar score={ch.score} tier={ch.performance_tier} />
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <TierBreakdownMini breakdown={ch.tier_breakdown} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

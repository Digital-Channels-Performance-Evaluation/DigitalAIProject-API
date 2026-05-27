import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Divider, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  LinearProgress, Button, TextField,
} from '@mui/material';
import DownloadIcon      from '@mui/icons-material/Download';
import BarChartIcon      from '@mui/icons-material/BarChart';
import TimelineIcon      from '@mui/icons-material/Timeline';
import TableChartIcon    from '@mui/icons-material/TableChart';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine, Area, AreaChart,
} from 'recharts';
import {
  listModels, listDatasets,
  getConfusionMatrix, getDataProfile, getChannelTrend,
  getChannelsOverview, exportPredictions, exportDataset,
} from '../api/endpoints';
import SectionHeader from '../components/common/SectionHeader';
import StatusBadge   from '../components/common/StatusBadge';

const TIER_COLORS = { Excellent: '#10b981', Good: '#6366f1', Average: '#f59e0b', Poor: '#ef4444' };
const TIERS = ['Excellent', 'Good', 'Average', 'Poor'];

// ── Confusion Matrix ──────────────────────────────────────────────────────────
function ConfusionMatrix({ data }) {
  if (!data) return null;
  const max = Math.max(...data.matrix.flat());
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
        Predicted →
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Y-axis label */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
          <Typography variant="caption" sx={{
            color: 'text.secondary', writingMode: 'vertical-rl',
            transform: 'rotate(180deg)', fontSize: '0.65rem',
          }}>
            Actual ↓
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {/* Header row */}
          <Box sx={{ display: 'flex', mb: 0.5, pl: 9 }}>
            {TIERS.map(t => (
              <Box key={t} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: TIER_COLORS[t], fontWeight: 700, fontSize: '0.65rem' }}>
                  {t.slice(0, 3)}
                </Typography>
              </Box>
            ))}
          </Box>
          {/* Matrix rows */}
          {TIERS.map((actual, i) => (
            <Box key={actual} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{
                color: TIER_COLORS[actual], fontWeight: 700,
                minWidth: 72, fontSize: '0.65rem',
              }}>
                {actual}
              </Typography>
              {TIERS.map((pred, j) => {
                const val = data.matrix[i][j];
                const isCorrect = i === j;
                const intensity = max > 0 ? val / max : 0;
                return (
                  <Tooltip key={pred} title={`Actual: ${actual} → Predicted: ${pred}: ${val}`}>
                    <Box sx={{
                      flex: 1, height: 44, mx: 0.25,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 1,
                      bgcolor: isCorrect
                        ? `${TIER_COLORS[actual]}${Math.round(intensity * 200 + 30).toString(16).padStart(2,'0')}`
                        : `rgba(239,68,68,${intensity * 0.5})`,
                      border: isCorrect ? `1px solid ${TIER_COLORS[actual]}66` : '1px solid rgba(239,68,68,0.2)',
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: val > 0 ? 'text.primary' : 'text.secondary' }}>
                        {val}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Per-class metrics */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>Per-Class Metrics</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tier</TableCell>
              <TableCell>Precision</TableCell>
              <TableCell>Recall</TableCell>
              <TableCell>F1</TableCell>
              <TableCell>Support</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TIERS.map(t => {
              const m = data.class_metrics[t];
              return (
                <TableRow key={t}>
                  <TableCell><StatusBadge status={t} /></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={m.precision * 100}
                        sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)',
                          '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[t] } }} />
                      <Typography variant="caption">{(m.precision * 100).toFixed(0)}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={m.recall * 100}
                        sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)',
                          '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[t] } }} />
                      <Typography variant="caption">{(m.recall * 100).toFixed(0)}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: TIER_COLORS[t] }}>
                      {(m.f1 * 100).toFixed(0)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{m.support}</Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ── Channel Trend Chart ───────────────────────────────────────────────────────
function ChannelTrendChart({ data, productId }) {
  if (!data?.length) return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>No trend data</Typography>
    </Box>
  );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
          tickFormatter={d => d?.slice(5)} />
        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <RTooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
          formatter={(v, n) => [n === 'score' ? `${v}/100` : `${v}%`, n === 'score' ? 'Score' : 'Confidence']}
        />
        <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Excellent', fill: '#10b981', fontSize: 10 }} />
        <ReferenceLine y={55} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Good', fill: '#6366f1', fontSize: 10 }} />
        <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Average', fill: '#f59e0b', fontSize: 10 }} />
        <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#scoreGrad)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="confidence" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Data Profile Table ────────────────────────────────────────────────────────
function DataProfileTable({ profile }) {
  if (!profile) return null;
  const cols = Object.keys(profile.numeric_profile || {});
  if (!cols.length) return <Typography variant="body2" sx={{ color: 'text.secondary' }}>No numeric columns</Typography>;
  return (
    <TableContainer sx={{ maxHeight: 340 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {['Feature', 'Count', 'Missing', 'Mean', 'Std', 'Min', 'Median', 'Max', 'Skew'].map(h => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {cols.map(col => {
            const s = profile.numeric_profile[col];
            return (
              <TableRow key={col} hover>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.light' }}>{col}</Typography>
                </TableCell>
                <TableCell><Typography variant="caption">{s.count}</Typography></TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: s.missing > 0 ? 'warning.main' : 'text.secondary' }}>
                    {s.missing}
                  </Typography>
                </TableCell>
                <TableCell><Typography variant="caption">{s.mean}</Typography></TableCell>
                <TableCell><Typography variant="caption">{s.std}</Typography></TableCell>
                <TableCell><Typography variant="caption">{s.min}</Typography></TableCell>
                <TableCell><Typography variant="caption">{s.median}</Typography></TableCell>
                <TableCell><Typography variant="caption">{s.max}</Typography></TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: Math.abs(s.skewness) > 1 ? 'warning.main' : 'text.secondary' }}>
                    {s.skewness}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [models,    setModels]    = useState([]);
  const [datasets,  setDatasets]  = useState([]);
  const [modelId,   setModelId]   = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [productId, setProductId] = useState('');
  const [channels,  setChannels]  = useState([]);

  const [cmData,    setCmData]    = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [trend,     setTrend]     = useState([]);

  const [loadingCm,  setLoadingCm]  = useState(false);
  const [loadingPro, setLoadingPro] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);

  useEffect(() => {
    Promise.all([listModels(), listDatasets()]).then(([mr, dr]) => {
      const ready = (mr.data || []).filter(m => m.status === 'ready');
      const done  = (dr.data?.datasets || []).filter(d => d.status === 'completed');
      setModels(ready);
      setDatasets(done);
      if (ready.length)  setModelId(ready[0].id);
      if (done.length)   setDatasetId(done[0].id);
    });
  }, []);

  // Load confusion matrix when model changes
  useEffect(() => {
    if (!modelId) return;
    setLoadingCm(true);
    getConfusionMatrix(modelId)
      .then(r => setCmData(r.data))
      .catch(() => setCmData(null))
      .finally(() => setLoadingCm(false));

    // Load channels for trend selector
    getChannelsOverview(modelId).then(r => {
      setChannels(r.data || []);
      if (r.data?.length) setProductId(r.data[0].product_id);
    }).catch(() => {});
  }, [modelId]);

  // Load data profile when dataset changes
  useEffect(() => {
    if (!datasetId) return;
    setLoadingPro(true);
    getDataProfile(datasetId)
      .then(r => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoadingPro(false));
  }, [datasetId]);

  // Load channel trend
  useEffect(() => {
    if (!productId) return;
    setLoadingTrend(true);
    getChannelTrend(productId, modelId || undefined)
      .then(r => setTrend(r.data?.data || []))
      .catch(() => setTrend([]))
      .finally(() => setLoadingTrend(false));
  }, [productId, modelId]);

  const handleExportPredictions = () => {
    if (!modelId) return;
    const url = exportPredictions(modelId);
    const token = localStorage.getItem('token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `predictions_model_${modelId}.csv`;
        a.click();
      });
  };

  const handleExportDataset = () => {
    if (!datasetId) return;
    const url = exportDataset(datasetId);
    const token = localStorage.getItem('token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `dataset_${datasetId}_featured.csv`;
        a.click();
      });
  };

  return (
    <Box>
      <SectionHeader
        title="Analytics"
        subtitle="Confusion matrix, data profiling, channel trends & exports"
      />

      {/* Selectors */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Model</InputLabel>
              <Select value={modelId} label="Model" onChange={e => setModelId(e.target.value)}>
                {models.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Dataset (for profiling)</InputLabel>
              <Select value={datasetId} label="Dataset (for profiling)" onChange={e => setDatasetId(e.target.value)}>
                {datasets.map(d => <MenuItem key={d.id} value={d.id}>{d.original_filename}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                onClick={handleExportPredictions} disabled={!modelId}>
                Export Predictions
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                onClick={handleExportDataset} disabled={!datasetId}>
                Export Dataset
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* ── Confusion Matrix ─────────────────────────────────────────── */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BarChartIcon sx={{ color: 'primary.light' }} />
              <Typography variant="h6">Confusion Matrix</Typography>
              {cmData && (
                <Chip label={`${cmData.total_predictions} predictions`} size="small"
                  sx={{ ml: 'auto', fontSize: '0.7rem' }} />
              )}
            </Box>
            {loadingCm ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
            ) : cmData ? (
              <ConfusionMatrix data={cmData} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
                Run predictions first to see the confusion matrix
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* ── Channel Trend ─────────────────────────────────────────────── */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon sx={{ color: 'secondary.light' }} />
                <Typography variant="h6">Channel Performance Trend</Typography>
              </Box>
              <FormControl size="small" sx={{ minWidth: 180, ml: 'auto' }}>
                <InputLabel>Channel</InputLabel>
                <Select value={productId} label="Channel" onChange={e => setProductId(e.target.value)}>
                  {channels.map(c => (
                    <MenuItem key={c.product_id} value={c.product_id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {c.product_id}
                        <StatusBadge status={c.tier} />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {loadingTrend ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
            ) : (
              <ChannelTrendChart data={trend} productId={productId} />
            )}
            <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
              {[
                { color: '#6366f1', label: '— Score (0–100)' },
                { color: '#06b6d4', label: '- - Confidence %' },
              ].map(l => (
                <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 20, height: 2, bgcolor: l.color }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{l.label}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Channels overview mini-table */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TableChartIcon sx={{ color: 'warning.main' }} />
              <Typography variant="h6">All Channels Overview</Typography>
            </Box>
            {channels.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No data</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 260 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Channel</TableCell>
                      <TableCell>Tier</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Predictions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {channels.map(c => (
                      <TableRow key={c.product_id} hover
                        onClick={() => setProductId(c.product_id)}
                        sx={{ cursor: 'pointer', bgcolor: productId === c.product_id ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {c.product_id}
                          </Typography>
                        </TableCell>
                        <TableCell><StatusBadge status={c.tier} /></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={c.score}
                              sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)',
                                '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[c.tier] } }} />
                            <Typography variant="caption">{c.score}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.avg_confidence}%</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.count}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* ── Data Profile ──────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TableChartIcon sx={{ color: 'success.main' }} />
              <Typography variant="h6">Data Profile</Typography>
              {profile && (
                <Chip label={`${profile.row_count?.toLocaleString()} rows · ${profile.column_count} cols`}
                  size="small" sx={{ ml: 1, fontSize: '0.7rem' }} />
              )}
            </Box>
            {loadingPro ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
            ) : profile ? (
              <DataProfileTable profile={profile} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                Select a processed dataset to view its statistical profile
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Divider, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  LinearProgress, Button, useTheme,
} from '@mui/material';
import DownloadIcon      from '@mui/icons-material/Download';
import BarChartIcon      from '@mui/icons-material/BarChart';
import TimelineIcon      from '@mui/icons-material/Timeline';
import TableChartIcon    from '@mui/icons-material/TableChart';
import BubbleChartIcon   from '@mui/icons-material/BubbleChart';
import InsightsIcon      from '@mui/icons-material/Insights';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine, Area, AreaChart,
  BarChart, Bar, Cell, PieChart, Pie, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  listModels, listDatasets,
  getConfusionMatrix, getDataProfile, getChannelTrend,
  getChannelsOverview, exportPredictions, exportDataset,
  getPredictions, getModel,
  getModelComparison,
} from '../api/endpoints';
import SectionHeader    from '../components/common/SectionHeader';
import StatusBadge      from '../components/common/StatusBadge';
import FeatureImportanceChart from '../components/ML/FeatureImportanceChart';

const TIER_COLORS = { High: '#10b981', Medium: '#f59e0b', Low: '#ef4444' };
const TIERS = ['High', 'Medium', 'Low'];

// ── Confusion Matrix ──────────────────────────────────────────────────────────
function ConfusionMatrix({ data }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const progressTrack = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

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
                        sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: progressTrack,
                          '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[t] } }} />
                      <Typography variant="caption">{(m.precision * 100).toFixed(0)}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={m.recall * 100}
                        sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: progressTrack,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tickColor   = theme.palette.text.secondary;
  const tooltipBg   = theme.palette.background.paper;
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
  const gridColor   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';

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
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false}
          tickFormatter={d => d?.slice(5)} />
        <YAxis domain={[0, 100]} tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
        <RTooltip
          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: theme.palette.text.primary }}
          formatter={(v, n) => [n === 'score' ? `${v}/100` : `${v}%`, n === 'score' ? 'Score' : 'Confidence']}
        />
        <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'High ≥80', fill: '#10b981', fontSize: 10 }} />
        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Medium ≥50', fill: '#f59e0b', fontSize: 10 }} />
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const progressTrack = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const [models,    setModels]    = useState([]);
  const [datasets,  setDatasets]  = useState([]);
  const [modelId,   setModelId]   = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [productId, setProductId] = useState('');
  const [channels,  setChannels]  = useState([]);
  const [allModels, setAllModels] = useState([]); // all ready models for comparison

  const [cmData,    setCmData]    = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [trend,     setTrend]     = useState([]);
  const [allPreds,  setAllPreds]  = useState([]);
  const [featImportance, setFeatImportance] = useState(null);
  const [compData,  setCompData]  = useState([]);  // model comparison data

  const [loadingCm,  setLoadingCm]  = useState(false);
  const [loadingPro, setLoadingPro] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);

  useEffect(() => {
    Promise.all([listModels(), listDatasets()]).then(([mr, dr]) => {
      const ready = (mr.data || []).filter(m => m.status === 'ready');
      const done  = (dr.data?.datasets || []).filter(d => d.status === 'completed');
      setModels(ready);
      setAllModels(ready); // keep all for comparison
      setDatasets(done);
      if (ready.length)  setModelId(ready[0].id);
      if (done.length)   setDatasetId(done[0].id);
    });
    // Load model comparison data once on mount
    getModelComparison()
      .then(r => setCompData(r.data || []))
      .catch(() => setCompData([]));
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

    // Load all predictions for EDA
    getPredictions(modelId, 2000)
      .then(r => setAllPreds(r.data.predictions || []))
      .catch(() => setAllPreds([]));

    // Load feature importance from the model
    getModel(modelId)
      .then(r => setFeatImportance(r.data.feature_importance || null))
      .catch(() => setFeatImportance(null));
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
        {/* ── Model Comparison ─────────────────────────────────────────── */}
        {(compData.length > 0 || allModels.length > 1) && (() => {
          // Use compData from dashboard API; fall back to allModels list metrics
          const rows = compData.length > 0
            ? compData
            : allModels.map(m => ({
                id: m.id,
                name: m.name,
                model_type: m.model_type,
                accuracy: m.accuracy,
                precision_score: m.precision_score,
                recall_score: m.recall_score,
                f1_score: m.f1_score,
              }));

          const metrics = ['accuracy', 'precision_score', 'recall_score', 'f1_score'];
          const metricLabels = { accuracy: 'Accuracy', precision_score: 'Precision', recall_score: 'Recall', f1_score: 'F1' };
          const metricColors = { accuracy: '#6366f1', precision_score: '#10b981', recall_score: '#f59e0b', f1_score: '#06b6d4' };

          // Best model per metric
          const bestPer = {};
          metrics.forEach(m => {
            const best = [...rows].sort((a, b) => (b[m] || 0) - (a[m] || 0))[0];
            if (best) bestPer[m] = best;
          });

          // Bar chart data — one entry per model, grouped bars
          const barData = rows.map(m => ({
            name: m.name?.length > 14 ? m.name.slice(0, 14) + '…' : (m.name || `Model ${m.id}`),
            fullName: m.name || `Model ${m.id}`,
            Accuracy:  Math.round((m.accuracy || 0) * 100),
            Precision: Math.round((m.precision_score || 0) * 100),
            Recall:    Math.round((m.recall_score || 0) * 100),
            F1:        Math.round((m.f1_score || 0) * 100),
          }));

          // Radar data — spider chart across metrics for each model
          const radarData = metrics.map(mk => {
            const entry = { metric: metricLabels[mk] };
            rows.forEach(m => {
              entry[m.name || `M${m.id}`] = Math.round((m[mk] || 0) * 100);
            });
            return entry;
          });

          const COMP_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#f97316'];
          const tc  = theme.palette.text.secondary;
          const tp  = theme.palette.text.primary;
          const ttBg  = theme.palette.background.paper;
          const ttBdr = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
          const gc    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

          return (
            <>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <InsightsIcon sx={{ color: '#6366f1' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    Model Evaluation &amp; Comparison
                  </Typography>
                  <Chip label={`${rows.length} models`} size="small"
                    sx={{ ml: 1, fontSize: '0.68rem', bgcolor: 'rgba(99,102,241,0.12)', color: 'primary.light' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2, pl: 0.5 }}>
                  Side-by-side performance metrics across all trained models. Chronological (no look-ahead) train/test split.
                </Typography>
              </Grid>

              {/* Grouped bar chart */}
              <Grid item xs={12} lg={7}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Accuracy / Precision / Recall / F1 per Model (%)
                  </Typography>
                  <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 52)}>
                    <BarChart data={barData} layout="vertical"
                      margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: tc, fontSize: 10 }}
                        axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <YAxis dataKey="name" type="category" width={120}
                        tick={{ fill: tp, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <RTooltip
                        contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, borderRadius: 8 }}
                        itemStyle={{ color: tp }}
                        formatter={(v, n) => [`${v}%`, n]}
                        labelFormatter={l => {
                          const r = barData.find(d => d.name === l);
                          return r?.fullName || l;
                        }}
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                      />
                      <Bar dataKey="Accuracy"  fill={metricColors.accuracy}       radius={[0,3,3,0]} maxBarSize={14} />
                      <Bar dataKey="Precision" fill={metricColors.precision_score} radius={[0,3,3,0]} maxBarSize={14} />
                      <Bar dataKey="Recall"    fill={metricColors.recall_score}    radius={[0,3,3,0]} maxBarSize={14} />
                      <Bar dataKey="F1"        fill={metricColors.f1_score}        radius={[0,3,3,0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {metrics.map(m => (
                      <Box key={m} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: metricColors[m] }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.67rem' }}>{metricLabels[m]}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Radar chart */}
              <Grid item xs={12} lg={5}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Model Radar — All Metrics
                  </Typography>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                      <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'} />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: tc, fontSize: 11 }} />
                      <PolarRadiusAxis angle={45} domain={[0, 100]} tick={{ fill: tc, fontSize: 9 }} />
                      {rows.map((m, i) => (
                        <Radar key={m.id}
                          name={m.name || `Model ${m.id}`}
                          dataKey={m.name || `M${m.id}`}
                          stroke={COMP_COLORS[i % COMP_COLORS.length]}
                          fill={COMP_COLORS[i % COMP_COLORS.length]}
                          fillOpacity={0.12}
                          strokeWidth={1.5}
                        />
                      ))}
                      <RTooltip contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, borderRadius: 8 }}
                        itemStyle={{ color: tp }} formatter={v => [`${v}%`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {rows.map((m, i) => (
                      <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COMP_COLORS[i % COMP_COLORS.length] }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                          {m.name || `Model ${m.id}`}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Best-per-metric highlight cards */}
              {Object.keys(bestPer).length > 0 && (
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    {metrics.map(mk => {
                      const best = bestPer[mk];
                      if (!best) return null;
                      return (
                        <Grid item xs={6} sm={3} key={mk}>
                          <Paper sx={{
                            p: 2, textAlign: 'center',
                            border: `1px solid ${metricColors[mk]}40`,
                            bgcolor: `${metricColors[mk]}0a`,
                          }}>
                            <Typography variant="caption" sx={{
                              color: 'text.secondary', fontSize: '0.68rem',
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              display: 'block', mb: 0.5,
                            }}>
                              Best {metricLabels[mk]}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: metricColors[mk] }}>
                              {Math.round((best[mk] || 0) * 100)}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                              {best.name || `Model ${best.id}`}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
              )}

              {/* Full comparison table */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Full Model Comparison Table
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Model</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Accuracy</TableCell>
                          <TableCell>Precision</TableCell>
                          <TableCell>Recall</TableCell>
                          <TableCell>F1</TableCell>
                          <TableCell>Split</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((m, i) => {
                          const tp_val = m.training_params || {};
                          const isChron = tp_val.split_method === 'chronological';
                          return (
                            <TableRow key={m.id} hover
                              sx={{ bgcolor: m.id === modelId ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COMP_COLORS[i % COMP_COLORS.length], flexShrink: 0 }} />
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {m.name || `Model ${m.id}`}
                                  </Typography>
                                  {m.id === modelId && (
                                    <Chip label="selected" size="small"
                                      sx={{ fontSize: '0.6rem', height: 16, bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.light' }} />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                  {m.model_type}
                                </Typography>
                              </TableCell>
                              {metrics.map(mk => (
                                <TableCell key={mk}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <LinearProgress variant="determinate" value={Math.round((m[mk] || 0) * 100)}
                                      sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: progressTrack,
                                        '& .MuiLinearProgress-bar': { bgcolor: metricColors[mk] } }} />
                                    <Typography variant="caption" sx={{ color: metricColors[mk], fontWeight: 700 }}>
                                      {Math.round((m[mk] || 0) * 100)}%
                                    </Typography>
                                  </Box>
                                </TableCell>
                              ))}
                              <TableCell>
                                <Chip
                                  label={isChron ? 'Chronological' : 'Random'}
                                  size="small"
                                  sx={{
                                    fontSize: '0.6rem', height: 18,
                                    bgcolor: isChron ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                    color: isChron ? '#10b981' : '#f59e0b',
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </>
          );
        })()}

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
                              sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: progressTrack,
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

        {/* ── EDA: Score + Confidence Distribution ─────────────────────── */}
        {allPreds.length > 0 && (() => {
          const theme2 = theme;
          const isDark2 = isDark;
          const tickC = theme2.palette.text.secondary;
          const ttBg  = theme2.palette.background.paper;
          const ttBdr = isDark2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
          const gc    = isDark2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

          // Score distribution buckets 0-9, 10-19, ..., 90-100
          const scoreBuckets = Array.from({length: 10}, (_, i) => ({
            range: `${i*10}–${i*10+9}`,
            count: 0,
          }));
          allPreds.forEach(p => {
            const s = p.predicted_value || 0;
            const b = Math.min(Math.floor(s / 10), 9);
            scoreBuckets[b].count++;
          });

          // Confidence distribution 0-9%, 10-19%,...
          const confBuckets = Array.from({length: 10}, (_, i) => ({
            range: `${i*10}–${i*10+9}%`,
            count: 0,
          }));
          allPreds.forEach(p => {
            const c = Math.round((p.confidence || 0) * 100);
            const b = Math.min(Math.floor(c / 10), 9);
            confBuckets[b].count++;
          });

          // Tier distribution
          const tierCounts = { High: 0, Medium: 0, Low: 0 };
          allPreds.forEach(p => { if (tierCounts[p.prediction_label] !== undefined) tierCounts[p.prediction_label]++; });
          const tierData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));

          return (
            <>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ color: 'text.primary', mb: 1, px: 0.5 }}>
                  EDA — Prediction Distributions
                </Typography>
              </Grid>

              {/* Score Distribution Histogram */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InsightsIcon sx={{ color: '#6366f1' }} />
                    <Typography variant="h6">Score Distribution</Typography>
                    <Chip label={`${allPreds.length} predictions`} size="small" sx={{ ml: 'auto' }} />
                  </Box>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={scoreBuckets} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                      <XAxis dataKey="range" tick={{ fill: tickC, fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: tickC, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RTooltip contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, borderRadius: 8 }}
                        labelStyle={{ color: theme2.palette.text.primary }} />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={30}>
                        {scoreBuckets.map((b, idx) => {
                          const midScore = idx * 10 + 5;
                          const color = midScore >= 80 ? '#10b981' : midScore >= 50 ? '#f59e0b' : '#ef4444';
                          return <Cell key={b.range} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center' }}>
                    {[['#10b981', '≥80 High'], ['#f59e0b', '50–79 Medium'], ['#ef4444', '<50 Low']].map(([c, l]) => (
                      <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: c }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{l}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Confidence Distribution */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <BarChartIcon sx={{ color: '#06b6d4' }} />
                    <Typography variant="h6">Confidence Distribution</Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={confBuckets} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gc} />
                      <XAxis dataKey="range" tick={{ fill: tickC, fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: tickC, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RTooltip contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, borderRadius: 8 }}
                        labelStyle={{ color: theme2.palette.text.primary }} />
                      <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Tier Pie */}
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <BubbleChartIcon sx={{ color: '#8b5cf6' }} />
                    <Typography variant="h6">Tier Split</Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={tierData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3}
                        label={({ name, percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''}
                        labelLine={false}>
                        {tierData.map(e => <Cell key={e.name} fill={TIER_COLORS[e.name] || '#888'} />)}
                      </Pie>
                      <RTooltip contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, borderRadius: 8 }}
                        itemStyle={{ color: theme2.palette.text.primary }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
                    {tierData.map(t => (
                      <Box key={t.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: TIER_COLORS[t.name] || '#888', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>{t.name}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: TIER_COLORS[t.name] || 'text.primary' }}>
                          {t.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </>
          );
        })()}

        {/* ── EDA: Feature Importance — Most Influential Features ─────── */}
        {featImportance && Object.keys(featImportance).length > 0 && (() => {
          // Build sorted bar data
          const data = Object.entries(featImportance)
            .map(([key, val]) => ({ feature: key, importance: parseFloat((val * 100).toFixed(2)) }))
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 15);

          const FEAT_LABELS = {
            active_user_rate:             'Active User Rate',
            revenue_per_txn:              'Revenue / Txn',
            revenue_per_active_user:      'Revenue / Active User',
            downtime_impact_score:        'Downtime Impact',
            operational_efficiency_score: 'Operational Efficiency',
            complaint_growth_rate:        'Complaint Growth',
            complaint_resolution_rate:    'Complaint Resolution',
            user_growth_rate:             'User Growth Rate',
            txn_growth_rate:              'Txn Growth Rate',
            revenue_growth_rate:          'Revenue Growth Rate',
            churn_rate:                   'Churn Rate',
            new_user_rate:                'New User Rate',
            revenue_per_user:             'Revenue / User',
            txn_volume_3m_avg:            '3M Txn Avg',
            revenue_3m_avg:               '3M Revenue Avg',
          };

          const PALETTE = [
            '#6366f1','#8b5cf6','#06b6d4','#10b981',
            '#f59e0b','#ef4444','#ec4899','#14b8a6',
            '#f97316','#a3e635','#0ea5e9','#d946ef',
            '#84cc16','#22d3ee','#fb7185',
          ];

          const chartData = data.map((d, i) => ({
            feature: FEAT_LABELS[d.feature] || d.feature,
            importance: d.importance,
            color: PALETTE[i % PALETTE.length],
          }));

          const tc  = theme.palette.text.secondary;
          const tp  = theme.palette.text.primary;
          const ttBg  = theme.palette.background.paper;
          const ttBdr = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
          const gc    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

          // Top 3 features summary
          const top3 = chartData.slice(0, 3);
          const totalTop3 = top3.reduce((s, d) => s + d.importance, 0);

          return (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <InsightsIcon sx={{ color: '#6366f1' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    Feature Importance — What Drives Performance Tier?
                  </Typography>
                  <Chip label="Target: performance_tier" size="small"
                    sx={{ ml: 'auto', fontSize: '0.65rem', bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.light' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2.5 }}>
                  Features are ranked by their contribution to predicting High / Medium / Low tier.
                  Top 3 features account for <strong style={{ color: tp }}>{totalTop3.toFixed(1)}%</strong> of total importance.
                </Typography>

                <Grid container spacing={3}>
                  {/* Bar chart */}
                  <Grid item xs={12} md={8}>
                    <ResponsiveContainer width="100%" height={chartData.length * 34 + 20}>
                      <BarChart data={chartData} layout="vertical"
                        margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gc} horizontal={false} />
                        <XAxis type="number" tick={{ fill: tc, fontSize: 11 }}
                          axisLine={false} tickLine={false}
                          tickFormatter={v => `${v}%`} />
                        <YAxis dataKey="feature" type="category" width={170}
                          tick={{ fill: tp, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RTooltip
                          contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, borderRadius: 8 }}
                          itemStyle={{ color: tp }}
                          formatter={v => [`${v}%`, 'Importance']}
                          cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                        />
                        <Bar dataKey="importance" radius={[0, 4, 4, 0]} maxBarSize={22}>
                          {chartData.map(d => (
                            <Cell key={d.feature} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>

                  {/* Top 3 call-out cards */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2"
                      sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em', mb: 1.5 }}>
                      Top Drivers
                    </Typography>
                    {top3.map((d, i) => (
                      <Box key={d.feature} sx={{
                        p: 1.5, mb: 1, borderRadius: 2,
                        bgcolor: d.color + '12',
                        border: `1px solid ${d.color}30`,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Box sx={{ width: 18, height: 18, borderRadius: '50%',
                            bgcolor: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0 }}>
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff' }}>{i+1}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: d.color }}>
                            {d.feature}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={Math.min(d.importance, 100)}
                            sx={{ flexGrow: 1, height: 5, borderRadius: 3,
                              bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                              '& .MuiLinearProgress-bar': { bgcolor: d.color } }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: d.color, minWidth: 36 }}>
                            {d.importance}%
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2,
                      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        💡 <strong style={{ color: tp }}>Interpretation:</strong> Features with higher importance
                        have more influence on whether a channel is classified as High, Medium, or Low.
                        Focus improvement efforts on these features to move channels to higher tiers.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          );
        })()}
        {channels.length > 0 && (() => {
          const tc = theme.palette.text.secondary;
          const radarData = channels.map(c => ({
            channel: c.product_id.replace(/_/g, ' ').slice(0, 10),
            score:   c.score,
            confidence: c.avg_confidence,
          }));
          const ttBg2 = theme.palette.background.paper;
          const ttBdr2 = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';

          return (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <BubbleChartIcon sx={{ color: '#8b5cf6' }} />
                  <Typography variant="h6">Channel Radar — Score vs Confidence</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'} />
                    <PolarAngleAxis dataKey="channel" tick={{ fill: tc, fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: tc, fontSize: 9 }} />
                    <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    <Radar name="Confidence" dataKey="confidence" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
                    <RTooltip contentStyle={{ background: ttBg2, border: `1px solid ${ttBdr2}`, borderRadius: 8 }}
                      itemStyle={{ color: theme.palette.text.primary }} />
                  </RadarChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 1 }}>
                  {[['#6366f1', 'Score'], ['#06b6d4', 'Confidence %']].map(([c, l]) => (
                    <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 12, height: 3, bgcolor: c, borderRadius: 2 }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{l}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          );
        })()}

        {/* ── EDA: Top Features by Std Dev (from data profile) ─────────── */}
        {profile?.numeric_profile && (() => {
          const np = profile.numeric_profile;
          const features = Object.entries(np)
            .filter(([, s]) => s.std != null && s.std > 0)
            .sort(([, a], [, b]) => (b.std || 0) - (a.std || 0))
            .slice(0, 10)
            .map(([col, s]) => ({
              feature: col.replace(/_/g, ' ').slice(0, 22),
              std: s.std,
              skew: Math.abs(s.skewness || 0),
            }));

          if (!features.length) return null;
          const tc = theme.palette.text.secondary;
          const ttBg3 = theme.palette.background.paper;
          const ttBdr3 = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
          const gc3 = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

          return (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <InsightsIcon sx={{ color: '#f59e0b' }} />
                  <Typography variant="h6">Top Features by Variability (Std Dev)</Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                  High std dev = more signal for the model. High skew = consider transformation.
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={features} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gc3} horizontal={false} />
                    <XAxis type="number" tick={{ fill: tc, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="feature" type="category" width={140}
                      tick={{ fill: theme.palette.text.primary, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ background: ttBg3, border: `1px solid ${ttBdr3}`, borderRadius: 8 }}
                      itemStyle={{ color: theme.palette.text.primary }}
                      formatter={(v, n) => [v.toFixed(2), n === 'std' ? 'Std Dev' : 'Abs Skew']} />
                    <Bar dataKey="std" name="std" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {features.map((f, i) => (
                        <Cell key={f.feature}
                          fill={f.skew > 2 ? '#ef4444' : f.skew > 1 ? '#f59e0b' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[['#10b981', 'Low skew (|skew|<1)'], ['#f59e0b', 'Moderate (1–2)'], ['#ef4444', 'High skew (>2)']].map(([c, l]) => (
                    <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.63rem' }}>{l}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          );
        })()}

      </Grid>
    </Box>
  );
}

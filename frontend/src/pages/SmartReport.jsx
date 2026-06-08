import { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Button, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, useTheme,
} from '@mui/material';
import DownloadIcon       from '@mui/icons-material/Download';
import RefreshIcon        from '@mui/icons-material/Refresh';
import AssessmentIcon     from '@mui/icons-material/Assessment';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import TrendingDownIcon   from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon   from '@mui/icons-material/TrendingFlat';
import EmojiEventsIcon    from '@mui/icons-material/EmojiEvents';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import TimelineIcon       from '@mui/icons-material/Timeline';
import TableChartIcon     from '@mui/icons-material/TableChart';
import InfoOutlinedIcon   from '@mui/icons-material/InfoOutlined';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { listModels, getReportData, downloadReport, getChannelTrend, getChannelsOverview } from '../api/endpoints';
import SectionHeader from '../components/common/SectionHeader';
import StatusBadge   from '../components/common/StatusBadge';
import { useToast }  from '../context/ToastContext';

const TIER_COLORS  = { High: '#10b981', Medium: '#f59e0b', Low: '#ef4444' };
const TIER_ORDER   = ['High', 'Medium', 'Low'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

// Tier gradient backgrounds for KPI cards (reserved for future use)
// const TIER_GRADIENTS = { ... }

// ── Per-channel distinct colors ───────────────────────────────────────────────
const CHANNEL_PALETTE = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#a3e635', '#0ea5e9', '#d946ef',
];
function channelColor(productId, index = 0) {
  if (!productId) return CHANNEL_PALETTE[index % CHANNEL_PALETTE.length];
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = productId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHANNEL_PALETTE[Math.abs(hash) % CHANNEL_PALETTE.length];
}

function TrendIcon({ trend, size = 16 }) {
  if (trend === 1)  return <TrendingUpIcon   sx={{ fontSize: size, color: 'success.main' }} />;
  if (trend === -1) return <TrendingDownIcon sx={{ fontSize: size, color: 'error.main'   }} />;
  return               <TrendingFlatIcon  sx={{ fontSize: size, color: 'text.secondary' }} />;
}

function ScoreGauge({ score }) {
  const theme = useTheme();
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const trackColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{
        width: 110, height: 110, borderRadius: '50%',
        background: `conic-gradient(${color} ${score}%, ${trackColor} 0%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 32px ${color}55`,
      }}>
        <Box sx={{
          width: 84, height: 84, borderRadius: '50%',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1e2035 0%, #161827 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color, lineHeight: 1 }}>{score}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.58rem', letterSpacing: '0.05em' }}>/100</Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
        Avg Score
      </Typography>
    </Box>
  );
}

function KPICard({ label, value, sub, color = '#6366f1', icon }) {
  return (
    <Box sx={{
      p: 2, borderRadius: 2,
      bgcolor: color + '18',
      border: `1px solid ${color}40`,
      textAlign: 'center',
    }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color, lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', mt: 0.25, fontWeight: 500 }}>
        {label}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color, fontWeight: 600, fontSize: '0.65rem' }}>{sub}</Typography>
      )}
    </Box>
  );
}

function NarrativeSection({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <Box>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <Typography key={i} variant="h6"
              sx={{ mt: i > 0 ? 3 : 0, mb: 1, color: 'text.primary', fontWeight: 700 }}>
              {line.replace('## ', '')}
            </Typography>
          );
        }
        if (line.startsWith('---')) return <Divider key={i} sx={{ my: 2 }} />;
        if (line.startsWith('*') && line.endsWith('*')) {
          return (
            <Typography key={i} variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
              {line.replace(/\*/g, '')}
            </Typography>
          );
        }
        if (line.match(/^\d+\./)) {
          const bold = line.replace(/\*\*(.*?)\*\*/g, '$1');
          return (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'primary.light', fontWeight: 700, minWidth: 20 }}>
                {line.match(/^(\d+)\./)?.[1]}.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {bold.replace(/^\d+\.\s*/, '')}
              </Typography>
            </Box>
          );
        }
        if (line.startsWith('- ')) {
          const bold = line.replace(/\*\*(.*?)\*\*/g, '$1').replace('- ', '');
          return (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5, pl: 1 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.light', mt: 0.8, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: 'text.primary' }}>{bold}</Typography>
            </Box>
          );
        }
        if (line.trim() === '') return <Box key={i} sx={{ height: 4 }} />;
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <Typography key={i} variant="body2" sx={{ color: 'text.primary', mb: 0.5 }}>
            {parts.map((p, j) => j % 2 === 1
              ? <strong key={j}>{p}</strong>
              : p
            )}
          </Typography>
        );
      })}
    </Box>
  );
}

export default function SmartReport() {
  const theme   = useTheme();
  const toast   = useToast();
  const isDark  = theme.palette.mode === 'dark';

  const [models,  setModels]  = useState([]);
  const [modelId, setModelId] = useState('');
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  // ── New analytics state ───────────────────────────────────────────────────
  const [channelTrends,    setChannelTrends]    = useState({});   // { productId: [{date,score,confidence}] }
  const [trendsLoading,    setTrendsLoading]    = useState(false);
  const [channelsOverview, setChannelsOverview] = useState([]);
  const [overviewLoading,  setOverviewLoading]  = useState(false);

  // Theme-aware chart colors
  const tickColor     = theme.palette.text.secondary;
  const gridColor     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const tooltipBg     = theme.palette.background.paper;
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
  const dividerColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
  const progressTrack = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  useEffect(() => {
    listModels().then(r => {
      const ready = (r.data || []).filter(m => m.status === 'ready');
      setModels(ready);
      if (ready.length) setModelId(ready[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => { if (modelId) loadReport(); }, [modelId]);

  // Load channels overview whenever model changes
  useEffect(() => {
    if (!modelId) return;
    setOverviewLoading(true);
    getChannelsOverview(modelId)
      .then(r => setChannelsOverview(r.data || []))
      .catch(() => setChannelsOverview([]))
      .finally(() => setOverviewLoading(false));
  }, [modelId]);

  // Once report loads, fetch trend data for top 3 channels
  useEffect(() => {
    if (!report?.top_performers?.length || !modelId) return;
    const top3 = report.top_performers.slice(0, 3);
    setTrendsLoading(true);
    Promise.all(
      top3.map(c => getChannelTrend(c.product_id, modelId)
        .then(r => ({ id: c.product_id, data: r.data?.data || [] }))
        .catch(() => ({ id: c.product_id, data: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.id] = r.data; });
      setChannelTrends(map);
    }).finally(() => setTrendsLoading(false));
  }, [report, modelId]);

  const loadReport = () => {
    setLoading(true);
    getReportData(modelId)
      .then(r => setReport(r.data))
      .catch(e => toast.error(e.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  };

  const handleDownload = () => {
    const url   = downloadReport(modelId);
    const token = localStorage.getItem('token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `performance_report_${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
      });
  };

  const tierDist = report
    ? TIER_ORDER.map(t => ({ name: t, value: report.summary[`${t.toLowerCase()}_count`] || 0 }))
    : [];

  return (
    <Box>
      <SectionHeader
        title="Smart Report"
        subtitle="AI-generated performance analysis of all digital channels"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />}
              onClick={loadReport} disabled={loading || !modelId}>
              Regenerate
            </Button>
            <Button variant="contained" size="small" startIcon={<DownloadIcon />}
              onClick={handleDownload} disabled={!report}>
              Download .md
            </Button>
          </Box>
        }
      />

      {/* ── Model selector ─────────────────────────────────────────────── */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Model</InputLabel>
              <Select value={modelId} label="Select Model"
                onChange={e => setModelId(e.target.value)}>
                {models.length === 0 && <MenuItem disabled value="">No ready models</MenuItem>}
                {models.map(m => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} — {m.model_type} — {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}% acc` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {report && (
            <Grid item xs={12} sm={7}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Generated: {new Date(report.generated_at).toLocaleString()}
                </Typography>
                <Chip label={`${report.summary.total_channels} channels`} size="small" />
                <Chip label={`${report.summary.total_predictions.toLocaleString()} predictions`} size="small" />
              </Box>
            </Grid>
          )}
        </Grid>

        {/* ── Model Accuracy Summary row ───────────────────────────────── */}
        {(() => {
          const selectedModel = models.find(m => m.id === modelId);
          if (!selectedModel) return null;
          const acc      = selectedModel.accuracy  != null ? `${(selectedModel.accuracy  * 100).toFixed(1)}%` : '—';
          const f1       = selectedModel.f1_score   != null ? `${(selectedModel.f1_score   * 100).toFixed(1)}%` : '—';
          const tp       = selectedModel.training_params || {};
          const split    = tp.test_size != null ? `${Math.round(tp.test_size * 100)}% test` : tp.cv_folds ? `${tp.cv_folds}-fold CV` : '—';
          const dist     = selectedModel.class_distribution || tp.class_distribution;
          return (
            <Box sx={{
              mt: 2, pt: 2, borderTop: `1px solid ${dividerColor}`,
              display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Model Info
                </Typography>
              </Box>
              {[
                { label: 'Accuracy', value: acc,  color: '#10b981' },
                { label: 'F1',       value: f1,   color: '#6366f1' },
                { label: 'Split',    value: split, color: theme.palette.text.primary },
              ].map(item => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: item.color }}>
                    {item.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.label}</Typography>
                </Box>
              ))}
              {dist && Object.entries(dist).map(([tier, count]) => (
                <Box key={tier} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: TIER_COLORS[tier] || '#888',
                  }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {tier}: {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          );
        })()}
      </Paper>

      {loading ? (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
            Generating report…
          </Typography>
        </Box>
      ) : !report ? (
        <Paper sx={{ py: 10, textAlign: 'center' }}>
          <AssessmentIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Select a model to generate the report
          </Typography>
        </Paper>
      ) : (
        <Box ref={printRef}>

          {/* ── KPI Summary Row ─────────────────────────────────────────── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreGauge score={report.summary.avg_score} />
              </Box>
            </Grid>
            {[
              { label: 'High',     value: report.summary.high_count,      color: '#10b981', icon: <CheckCircleIcon /> },
              { label: 'Medium',   value: report.summary.medium_count,    color: '#f59e0b', icon: <WarningAmberIcon /> },
              { label: 'Low',      value: report.summary.low_count,       color: '#ef4444', icon: <WarningAmberIcon /> },
              { label: 'Improving', value: report.summary.improving_count, color: '#10b981', icon: <TrendingUpIcon />, sub: 'channels ↑' },
              { label: 'Declining', value: report.summary.declining_count, color: '#ef4444', icon: <TrendingDownIcon />, sub: 'channels ↓' },
            ].map(k => (
              <Grid item xs={6} sm={3} md key={k.label}>
                <KPICard {...k} />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>

            {/* ── Tier Distribution Pie ──────────────────────────────────── */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: 300 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>Tier Distribution</Typography>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={tierDist} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3}
                      label={({ name, percent }) =>
                        percent > 0.05 ? `${name.slice(0, 3)} ${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}>
                      {tierDist.map(e => <Cell key={e.name} fill={TIER_COLORS[e.name]} />)}
                    </Pie>
                    <RTooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: theme.palette.text.primary }}
                      itemStyle={{ color: theme.palette.text.primary }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* ── Score Bar Chart ────────────────────────────────────────── */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, height: 300 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>Channel Scores (Top 7)</Typography>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={report.channels.slice(0, 10).map(c => ({
                      name: c.product_id.replace(/_/g, ' ').slice(0, 14),
                      score: c.score,
                      tier: c.tier,
                    }))}
                    margin={{ top: 5, right: 20, left: -10, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 10 }}
                      axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fill: tickColor, fontSize: 11 }}
                      axisLine={false} tickLine={false} />
                    <RTooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: theme.palette.text.primary }}
                      itemStyle={{ color: theme.palette.text.primary }}
                      formatter={v => [`${v}/100`, 'Score']}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {report.channels.slice(0, 10).map((c, idx) => (
                        <Cell key={c.product_id} fill={channelColor(c.product_id, idx)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* ── Top Performers ─────────────────────────────────────────── */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmojiEventsIcon sx={{ color: '#FFD700' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>Top Performers</Typography>
                </Box>
                {report.top_performers.map((c, i) => {
                  const color = channelColor(c.product_id, i);
                  return (
                  <Box key={c.product_id} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, py: 1.25,
                    borderBottom: i < report.top_performers.length - 1
                      ? `1px solid ${dividerColor}` : 'none',
                  }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: MEDAL_COLORS[i], minWidth: 24 }}>
                      {['🥇', '🥈', '🥉'][i]}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color }}>
                        {c.product_id}
                      </Typography>
                      <LinearProgress variant="determinate" value={c.score}
                        sx={{ height: 5, borderRadius: 3, mt: 0.5,
                          bgcolor: progressTrack,
                          '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                    </Box>
                    <StatusBadge status={c.tier} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color, minWidth: 32 }}>
                      {c.score}
                    </Typography>
                    <TrendIcon trend={c.trend} />
                  </Box>
                  );
                })}
              </Paper>
            </Grid>

            {/* ── Needs Attention ────────────────────────────────────────── */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WarningAmberIcon sx={{ color: 'error.main' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>Needs Attention</Typography>
                </Box>
                {report.bottom_performers.map((c, i) => {
                  const color = channelColor(c.product_id, i + report.top_performers.length);
                  return (
                  <Box key={c.product_id} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, py: 1.25,
                    borderBottom: i < report.bottom_performers.length - 1
                      ? `1px solid ${dividerColor}` : 'none',
                  }}>
                    <Box sx={{
                      width: 24, height: 24, borderRadius: '50%',
                      bgcolor: color + '22', border: `1px solid ${color}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color }}>
                        {c.rank}
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color }}>
                        {c.product_id}
                      </Typography>
                      <LinearProgress variant="determinate" value={c.score}
                        sx={{ height: 5, borderRadius: 3, mt: 0.5,
                          bgcolor: progressTrack,
                          '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                    </Box>
                    <StatusBadge status={c.tier} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color, minWidth: 32 }}>
                      {c.score}
                    </Typography>
                    <TrendIcon trend={c.trend} />
                  </Box>
                  );
                })}
              </Paper>
            </Grid>

            {/* ── Executive Narrative — MOVED TO END ────────────────────── */}

            {/* ── Channel Performance Trend (top 3 mini area charts) ──── */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <TimelineIcon sx={{ color: 'secondary.light' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    Channel Performance Trend
                  </Typography>
                  <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    Top 3 channels over time
                  </Typography>
                  {trendsLoading && <CircularProgress size={16} sx={{ ml: 'auto' }} />}
                </Box>
                <Grid container spacing={2}>
                  {report.top_performers.slice(0, 3).map((c, idx) => {
                    const color    = channelColor(c.product_id, idx);
                    const trendData = channelTrends[c.product_id] || [];
                    const gradId   = `trendGrad_${idx}`;
                    return (
                      <Grid item xs={12} md={4} key={c.product_id}>
                        <Box sx={{
                          p: 2, borderRadius: 2,
                          border: `1px solid ${color}33`,
                          bgcolor: color + '08',
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{
                              width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0,
                            }} />
                            <Typography variant="caption" sx={{
                              fontWeight: 700, fontFamily: 'monospace', color,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {c.product_id}
                            </Typography>
                            <StatusBadge status={c.tier} />
                            <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 800, color }}>
                              {c.score}
                            </Typography>
                          </Box>
                          {trendData.length === 0 ? (
                            <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {trendsLoading
                                ? <CircularProgress size={18} />
                                : <Typography variant="caption" sx={{ color: 'text.secondary' }}>No trend data</Typography>
                              }
                            </Box>
                          ) : (
                            <ResponsiveContainer width="100%" height={100}>
                              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                <defs>
                                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0}   />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 9 }}
                                  axisLine={false} tickLine={false}
                                  tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
                                <YAxis domain={[0, 100]} tick={{ fill: tickColor, fontSize: 9 }}
                                  axisLine={false} tickLine={false} />
                                <RTooltip
                                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 6, fontSize: 11 }}
                                  labelStyle={{ color: theme.palette.text.primary }}
                                  formatter={(v, n) => [n === 'score' ? `${v}/100` : `${v}%`, n === 'score' ? 'Score' : 'Confidence']}
                                />
                                <Area type="monotone" dataKey="score" stroke={color}
                                  fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            </Grid>

            {/* ── Channels Overview Table ────────────────────────────────── */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TableChartIcon sx={{ color: 'warning.main' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>Channels Overview</Typography>
                  {channelsOverview.length > 0 && (
                    <Chip label={`${channelsOverview.length} channels`} size="small" sx={{ ml: 1 }} />
                  )}
                  {overviewLoading && <CircularProgress size={16} sx={{ ml: 'auto' }} />}
                </Box>
                {channelsOverview.length === 0 && !overviewLoading ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>No overview data available</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Channel</TableCell>
                          <TableCell>Tier</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>Avg Confidence</TableCell>
                          <TableCell>Predictions</TableCell>
                          <TableCell>Trend</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {channelsOverview.map((c, idx) => {
                          const color = channelColor(c.product_id, idx);
                          return (
                            <TableRow key={c.product_id} hover>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color }}>
                                  {c.product_id}
                                </Typography>
                              </TableCell>
                              <TableCell><StatusBadge status={c.tier} /></TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate" value={c.score}
                                    sx={{ width: 56, height: 4, borderRadius: 2,
                                      bgcolor: progressTrack,
                                      '& .MuiLinearProgress-bar': { bgcolor: color } }}
                                  />
                                  <Typography variant="caption" sx={{ fontWeight: 700, color }}>{c.score}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {c.avg_confidence != null ? `${c.avg_confidence}%` : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.count}</Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <TrendIcon trend={c.trend} size={14} />
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                                    {c.trend === 1 ? 'Improving' : c.trend === -1 ? 'Declining' : 'Stable'}
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>

            {/* ── Executive Narrative ───────────────────────────────────── */}
            {report.narrative && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
                    Executive Narrative
                  </Typography>
                  <NarrativeSection text={report.narrative} />
                </Paper>
              </Grid>
            )}

          </Grid>
        </Box>
      )}
    </Box>
  );
}

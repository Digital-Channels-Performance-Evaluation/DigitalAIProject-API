import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Button, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Tooltip, useTheme,
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
import InfoIcon           from '@mui/icons-material/Info';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { listModels, getReportData, downloadReport } from '../api/endpoints';
import SectionHeader from '../components/common/SectionHeader';
import StatusBadge   from '../components/common/StatusBadge';
import { useToast }  from '../context/ToastContext';

const TIER_COLORS  = { Excellent: '#10b981', Good: '#6366f1', Average: '#f59e0b', Poor: '#ef4444' };
const TIER_ORDER   = ['Excellent', 'Good', 'Average', 'Poor'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function TrendIcon({ trend, size = 16 }) {
  if (trend === 1)  return <TrendingUpIcon   sx={{ fontSize: size, color: 'success.main' }} />;
  if (trend === -1) return <TrendingDownIcon sx={{ fontSize: size, color: 'error.main'   }} />;
  return               <TrendingFlatIcon  sx={{ fontSize: size, color: 'text.secondary' }} />;
}

function ScoreGauge({ score }) {
  const theme = useTheme();
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#6366f1' : score >= 35 ? '#f59e0b' : '#ef4444';
  const trackColor = theme.palette.mode === 'dark'
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.08)';
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{
        width: 100, height: 100, borderRadius: '50%',
        background: `conic-gradient(${color} ${score}%, ${trackColor} 0%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 24px ${color}44`,
      }}>
        <Box sx={{
          width: 76, height: 76, borderRadius: '50%',
          bgcolor: 'background.paper',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color, lineHeight: 1 }}>{score}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>/100</Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ mt: 0.75, color: 'text.secondary' }}>Avg Score</Typography>
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
              { label: 'Excellent', value: report.summary.excellent_count, color: '#10b981', icon: <CheckCircleIcon /> },
              { label: 'Good',      value: report.summary.good_count,      color: '#6366f1', icon: <InfoIcon /> },
              { label: 'Average',   value: report.summary.average_count,   color: '#f59e0b', icon: <WarningAmberIcon /> },
              { label: 'Poor',      value: report.summary.poor_count,      color: '#ef4444', icon: <WarningAmberIcon /> },
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
                <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>Channel Scores (Top 10)</Typography>
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
                      {report.channels.slice(0, 10).map(c => (
                        <Cell key={c.product_id} fill={TIER_COLORS[c.tier]} />
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
                {report.top_performers.map((c, i) => (
                  <Box key={c.product_id} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, py: 1.25,
                    borderBottom: i < report.top_performers.length - 1
                      ? `1px solid ${dividerColor}` : 'none',
                  }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: MEDAL_COLORS[i], minWidth: 24 }}>
                      {['🥇', '🥈', '🥉'][i]}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'text.primary' }}>
                        {c.product_id}
                      </Typography>
                      <LinearProgress variant="determinate" value={c.score}
                        sx={{ height: 5, borderRadius: 3, mt: 0.5,
                          bgcolor: progressTrack,
                          '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[c.tier] } }} />
                    </Box>
                    <StatusBadge status={c.tier} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: TIER_COLORS[c.tier], minWidth: 32 }}>
                      {c.score}
                    </Typography>
                    <TrendIcon trend={c.trend} />
                  </Box>
                ))}
              </Paper>
            </Grid>

            {/* ── Needs Attention ────────────────────────────────────────── */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WarningAmberIcon sx={{ color: 'error.main' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>Needs Attention</Typography>
                </Box>
                {report.bottom_performers.map((c, i) => (
                  <Box key={c.product_id} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, py: 1.25,
                    borderBottom: i < report.bottom_performers.length - 1
                      ? `1px solid ${dividerColor}` : 'none',
                  }}>
                    <Box sx={{
                      width: 24, height: 24, borderRadius: '50%',
                      bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: 'error.main' }}>
                        {c.rank}
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'text.primary' }}>
                        {c.product_id}
                      </Typography>
                      <LinearProgress variant="determinate" value={c.score}
                        sx={{ height: 5, borderRadius: 3, mt: 0.5,
                          bgcolor: progressTrack,
                          '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[c.tier] } }} />
                    </Box>
                    <StatusBadge status={c.tier} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: TIER_COLORS[c.tier], minWidth: 32 }}>
                      {c.score}
                    </Typography>
                    <TrendIcon trend={c.trend} />
                  </Box>
                ))}
              </Paper>
            </Grid>

            {/* ── Executive Narrative ────────────────────────────────────── */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                  <AssessmentIcon sx={{ color: 'primary.light' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>Executive Narrative</Typography>
                  <Chip label="AI Generated" size="small"
                    sx={{ ml: 1, fontSize: '0.65rem', bgcolor: 'rgba(99,102,241,0.15)', color: 'primary.light' }} />
                </Box>
                <NarrativeSection text={report.narrative} />
              </Paper>
            </Grid>

            {/* ── Full Rankings Table ────────────────────────────────────── */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
                  Complete Channel Rankings
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    {report.channels.length} channels
                  </Typography>
                </Typography>
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 60 }}>Rank</TableCell>
                        <TableCell>Channel</TableCell>
                        <TableCell>Tier</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Predictions</TableCell>
                        <TableCell sx={{ width: 80 }}>Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.channels.map(c => (
                        <TableRow key={c.product_id} hover
                          sx={{
                            bgcolor: c.tier === 'Poor'
                              ? (isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.04)')
                              : c.tier === 'Excellent'
                              ? (isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.04)')
                              : 'transparent',
                          }}>
                          <TableCell>
                            <Typography sx={{
                              fontWeight: 800, fontSize: '0.85rem',
                              color: c.rank <= 3 ? MEDAL_COLORS[c.rank - 1] : 'text.secondary',
                            }}>
                              {c.rank <= 3 ? ['🥇', '🥈', '🥉'][c.rank - 1] : `#${c.rank}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'text.primary' }}>
                              {c.product_id}
                            </Typography>
                          </TableCell>
                          <TableCell><StatusBadge status={c.tier} /></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress variant="determinate" value={c.score}
                                sx={{ width: 60, height: 5, borderRadius: 3,
                                  bgcolor: progressTrack,
                                  '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[c.tier] } }} />
                              <Typography variant="caption" sx={{ fontWeight: 700, color: TIER_COLORS[c.tier] }}>
                                {c.score}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'text.primary' }}>
                              {c.confidence}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'text.primary' }}>
                              {c.count}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <TrendIcon trend={c.trend} />
                              <Typography variant="caption" sx={{ color: 'text.primary', fontSize: '0.65rem' }}>
                                {c.trend === 1 ? 'Improving' : c.trend === -1 ? 'Declining' : 'Stable'}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

          </Grid>
        </Box>
      )}
    </Box>
  );
}

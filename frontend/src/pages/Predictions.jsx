import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, Button, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress, TextField, InputAdornment, useTheme,
} from '@mui/material';
import InsightsIcon  from '@mui/icons-material/Insights';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon    from '@mui/icons-material/Search';
import DownloadIcon  from '@mui/icons-material/Download';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Cell,
} from 'recharts';
import { listModels, listDatasets, runPredictions, getPredictions, exportPredictions } from '../api/endpoints';
import StatusBadge   from '../components/common/StatusBadge';
import SectionHeader from '../components/common/SectionHeader';
import { useToast }  from '../context/ToastContext';

const TIER_COLORS = {
  High:   '#10b981',
  Medium: '#f59e0b',
  Low:    '#ef4444',
};

export default function Predictions() {
  const toast  = useToast();
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const tickColor    = theme.palette.text.secondary;
  const tooltipBg    = theme.palette.background.paper;
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
  const gridColor    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const progressTrack = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const chipInactive  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const [models,          setModels]          = useState([]);
  const [datasets,        setDatasets]        = useState([]);
  const [selectedModel,   setSelectedModel]   = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [predictions,     setPredictions]     = useState([]);
  const [running,         setRunning]         = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState('');
  const [tierFilter,      setTierFilter]      = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const [modRes, dsRes] = await Promise.all([listModels(), listDatasets()]);
        const readyModels = (modRes.data || []).filter(m => m.status === 'ready');
        const readyDs     = (dsRes.data.datasets || []).filter(d => d.status === 'completed');
        setModels(readyModels);
        setDatasets(readyDs);
        if (readyModels.length > 0) {
          setSelectedModel(readyModels[0].id);
          const predRes = await getPredictions(readyModels[0].id);
          setPredictions(predRes.data.predictions || []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleModelChange = async (modelId) => {
    setSelectedModel(modelId);
    if (!modelId) return;
    try {
      const res = await getPredictions(modelId);
      setPredictions(res.data.predictions || []);
    } catch { setPredictions([]); }
  };

  const handleRunPredictions = async () => {
    if (!selectedModel || !selectedDataset) return;
    setRunning(true);
    try {
      await runPredictions(selectedModel, selectedDataset);
      toast.info('Predictions are running in background…');
      // Poll until results appear (up to 30s)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const res = await getPredictions(selectedModel);
          const preds = res.data.predictions || [];
          if (preds.length > 0 || attempts >= 15) {
            clearInterval(poll);
            setRunning(false);
            if (preds.length > 0) {
              setPredictions(preds);
              toast.success(`${res.data.total.toLocaleString()} predictions ready.`);
            } else {
              toast.warning('Predictions still processing — refresh in a moment.');
            }
          }
        } catch { clearInterval(poll); setRunning(false); }
      }, 2000);
    } catch (err) {
      toast.error(err.message);
      setRunning(false);
    }
  };

  const handleExport = () => {
    if (!selectedModel) return;
    const url   = exportPredictions(selectedModel);
    const token = localStorage.getItem('token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `predictions_model_${selectedModel}.csv`;
        a.click();
        toast.success('Predictions exported successfully.');
      })
      .catch(() => toast.error('Export failed.'));
  };

  const tierCounts = predictions.reduce((acc, p) => {
    const tier = p.prediction_label || 'Unknown';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(tierCounts).map(([label, count]) => ({ label, count }));

  const filtered = predictions.filter(p => {
    const matchSearch = !search || p.product_id.toLowerCase().includes(search.toLowerCase());
    const matchTier   = tierFilter === 'All' || p.prediction_label === tierFilter;
    return matchSearch && matchTier;
  });

  return (
    <Box>
      <SectionHeader
        title="Predictions"
        subtitle="Run and explore channel performance predictions"
      />

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Run New Predictions</Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Model</InputLabel>
              <Select value={selectedModel} label="Model"
                onChange={e => handleModelChange(e.target.value)}>
                {models.length === 0 && <MenuItem disabled value="">No ready models</MenuItem>}
                {models.map(m => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.model_type}) — {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}% acc` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Dataset</InputLabel>
              <Select value={selectedDataset} label="Dataset"
                onChange={e => setSelectedDataset(e.target.value)}>
                {datasets.length === 0 && <MenuItem disabled value="">No processed datasets</MenuItem>}
                {datasets.map(ds => (
                  <MenuItem key={ds.id} value={ds.id}>{ds.original_filename}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained" fullWidth
              startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
              onClick={handleRunPredictions}
              disabled={!selectedModel || !selectedDataset || running}
            >
              {running ? 'Running…' : 'Run Predictions'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Tier Distribution Chart (full width, compact) ─────────────── */}
      {chartData.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Tier Distribution</Typography>
          <ResponsiveContainer width="100%" height={56 + chartData.length * 36}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false} tickLine={false} />
              <YAxis dataKey="label" type="category" tick={{ fill: tickColor, fontSize: 12 }}
                axisLine={false} tickLine={false} width={80} />
              <RTooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: theme.palette.text.primary }}
                itemStyle={{ color: theme.palette.text.primary }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map(entry => (
                  <Cell key={entry.label} fill={TIER_COLORS[entry.label] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* ── Results Table (full width) ────────────────────────────────── */}
      <Paper sx={{ p: 3 }}>
        {/* Table header row */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1,
        }}>
          {/* Left: title + tier filter chips */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">
              Results
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                {filtered.length.toLocaleString()} rows
              </Typography>
            </Typography>
            {['All', 'High', 'Medium', 'Low'].map(t => (
              <Chip
                key={t}
                label={t === 'All' ? `All (${predictions.length})` : `${t} (${tierCounts[t] || 0})`}
                size="small"
                onClick={() => setTierFilter(t)}
                sx={{
                  cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600,
                  bgcolor: tierFilter === t
                    ? (TIER_COLORS[t] ? TIER_COLORS[t] + '33' : 'primary.dark')
                    : chipInactive,
                  color: tierFilter === t
                    ? (TIER_COLORS[t] || 'primary.light')
                    : 'text.secondary',
                  border: `1px solid ${tierFilter === t ? (TIER_COLORS[t] || '#6366f1') : 'transparent'}`,
                }}
              />
            ))}
          </Box>

          {/* Right: search + export */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small" placeholder="Search product ID…" value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 200 }}
            />
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
              onClick={handleExport} disabled={!selectedModel || predictions.length === 0}>
              Export
            </Button>
          </Box>
        </Box>

        {/* Table */}
        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={32} /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <InsightsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No predictions yet. Select a model and dataset, then run predictions.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 160 }}>Product ID</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>Date</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Performance Tier</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Score</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'text.primary' }}>
                        {p.product_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.primary' }}>
                        {p.metric_date ? new Date(p.metric_date).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.prediction_label} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{
                        fontWeight: 700,
                        color: TIER_COLORS[p.prediction_label] || 'text.primary',
                      }}>
                        {p.predicted_value != null ? p.predicted_value : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.round((p.confidence || 0) * 100)}
                          sx={{
                            width: 80, height: 6, borderRadius: 3,
                            bgcolor: progressTrack,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: TIER_COLORS[p.prediction_label] || '#6366f1',
                              borderRadius: 3,
                            },
                          }}
                        />
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, minWidth: 38 }}>
                          {p.confidence ? `${(p.confidence * 100).toFixed(0)}%` : '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

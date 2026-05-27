import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, Button, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Alert, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress, TextField, InputAdornment,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Cell,
} from 'recharts';
import { listModels, listDatasets, runPredictions, getPredictions, exportPredictions } from '../api/endpoints';
import StatusBadge from '../components/common/StatusBadge';
import SectionHeader from '../components/common/SectionHeader';
import { useToast } from '../context/ToastContext';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';

const TIER_COLORS = {
  Excellent: '#10b981',
  Good: '#6366f1',
  Average: '#f59e0b',
  Poor: '#ef4444',
};

export default function Predictions() {
  const toast = useToast();
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const [modRes, dsRes] = await Promise.all([listModels(), listDatasets()]);
        const readyModels = (modRes.data || []).filter((m) => m.status === 'ready');
        const readyDs = (dsRes.data.datasets || []).filter((d) => d.status === 'completed');
        setModels(readyModels);
        setDatasets(readyDs);

        // Auto-load predictions for first ready model
        if (readyModels.length > 0) {
          setSelectedModel(readyModels[0].id);
          const predRes = await getPredictions(readyModels[0].id);
          setPredictions(predRes.data.predictions || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleModelChange = async (modelId) => {
    setSelectedModel(modelId);
    if (!modelId) return;
    try {
      const res = await getPredictions(modelId);
      setPredictions(res.data.predictions || []);
    } catch {
      setPredictions([]);
    }
  };

  const handleRunPredictions = async () => {
    if (!selectedModel || !selectedDataset) return;
    setRunning(true);
    setAlert(null);
    try {
      const res = await runPredictions(selectedModel, selectedDataset);
      setPredictions(res.data.predictions || []);
      toast.success(`${res.data.total} predictions generated successfully.`);
      setAlert({ severity: 'success', message: `${res.data.total} predictions generated successfully.` });
    } catch (err) {
      toast.error(err.message);
      setAlert({ severity: 'error', message: err.message });
    } finally {
      setRunning(false);
    }
  };

  // Aggregate tier counts for chart
  const tierCounts = predictions.reduce((acc, p) => {
    const tier = p.prediction_label || 'Unknown';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(tierCounts).map(([label, count]) => ({ label, count }));

  const filtered = predictions.filter((p) => {
    const matchSearch = !search || p.product_id.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'All' || p.prediction_label === tierFilter;
    return matchSearch && matchTier;
  });

  const handleExport = () => {
    if (!selectedModel) return;
    const url = exportPredictions(selectedModel);
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

  return (
    <Box>
      <SectionHeader
        title="Predictions"
        subtitle="Run and explore channel performance predictions"
      />

      {alert && (
        <Alert severity={alert.severity} onClose={() => setAlert(null)} sx={{ mb: 3 }}>
          {alert.message}
        </Alert>
      )}

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Run New Predictions</Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel}
                label="Model"
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {models.length === 0 && <MenuItem disabled value="">No ready models</MenuItem>}
                {models.map((m) => (
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
              <Select
                value={selectedDataset}
                label="Dataset"
                onChange={(e) => setSelectedDataset(e.target.value)}
              >
                {datasets.length === 0 && <MenuItem disabled value="">No processed datasets</MenuItem>}
                {datasets.map((ds) => (
                  <MenuItem key={ds.id} value={ds.id}>
                    {ds.original_filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              fullWidth
              startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
              onClick={handleRunPredictions}
              disabled={!selectedModel || !selectedDataset || running}
            >
              {running ? 'Running…' : 'Run Predictions'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 300 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Tier Distribution</Typography>
            {chartData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No data</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                  <RTooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.label} fill={TIER_COLORS[entry.label] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Predictions Table */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6">Results ({filtered.length})</Typography>
                {['All','Excellent','Good','Average','Poor'].map(t => (
                  <Chip key={t} label={t} size="small"
                    onClick={() => setTierFilter(t)}
                    sx={{
                      cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600,
                      bgcolor: tierFilter === t ? (TIER_COLORS[t] || 'primary.dark') + '33' : 'rgba(255,255,255,0.05)',
                      color: tierFilter === t ? (TIER_COLORS[t] || 'primary.light') : 'text.secondary',
                      border: `1px solid ${tierFilter === t ? (TIER_COLORS[t] || '#6366f1') : 'transparent'}`,
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small" placeholder="Search product ID…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                  sx={{ width: 180 }}
                />
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
                  onClick={handleExport} disabled={!selectedModel || predictions.length === 0}>
                  Export
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={32} />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <InsightsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No predictions yet. Select a model and dataset, then run predictions.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Performance Tier</TableCell>
                      <TableCell>Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                            {p.product_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {p.metric_date ? new Date(p.metric_date).toLocaleDateString() : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.prediction_label} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.round((p.confidence || 0) * 100)}
                              sx={{
                                width: 60,
                                height: 5,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.08)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: TIER_COLORS[p.prediction_label] || '#6366f1',
                                  borderRadius: 3,
                                },
                              }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
        </Grid>
      </Grid>
    </Box>
  );
}

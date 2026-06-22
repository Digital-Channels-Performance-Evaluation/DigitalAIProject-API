'use client';

import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Button, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Tooltip, Chip, Switch, FormControlLabel, Alert,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SettingsIcon from '@mui/icons-material/Settings';
import { trainModel, listModels, listDatasets, deleteModel, getAutoTrainConfig, updateAutoTrainConfig } from '../api/endpoints';
import StatusBadge from '../components/common/StatusBadge';
import SectionHeader from '../components/common/SectionHeader';
import ModelDetailDrawer from '../components/ML/ModelDetailDrawer';
import { useToast } from '../context/ToastContext';

const MODEL_TYPES = [
  { value: 'xgboost', label: 'XGBoost', desc: 'Best overall performance' },
  { value: 'random_forest', label: 'Random Forest', desc: 'Robust & interpretable' },
  { value: 'gradient_boosting', label: 'Gradient Boosting', desc: 'High accuracy, slower' },
];

function MetricBar({ value, color = '#6366f1' }) {
  if (value == null) return <Typography variant="caption" sx={{ color: 'text.secondary' }}>—</Typography>;
  const pct = Math.round(value * 100);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flexGrow: 1, maxWidth: 80 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, minWidth: 36 }}>
        {pct}%
      </Typography>
    </Box>
  );
}

export default function ModelTraining() {
  const toast = useToast();
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedModelType, setSelectedModelType] = useState('xgboost');
  const [training, setTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerModel, setDrawerModel] = useState(null);
  const [autoTrainEnabled, setAutoTrainEnabled] = useState(false);
  const [autoTrainLoading, setAutoTrainLoading] = useState(false);

  const fetchAll = async () => {
    try {
      const [dsRes, modRes, configRes] = await Promise.all([
        listDatasets(), 
        listModels(), 
        getAutoTrainConfig().catch(() => ({ data: { auto_train_on_upload: false } }))
      ]);
      const ready = (dsRes.data.datasets || []).filter((d) => d.status === 'completed');
      setDatasets(ready);
      setModels(modRes.data || []);
      setAutoTrainEnabled(configRes.data.auto_train_on_upload);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTrain = async () => {
    if (!selectedDataset) return;
    setTraining(true);
    try {
      const res = await trainModel({
        dataset_id: parseInt(selectedDataset),
        model_type: selectedModelType,
        target: 'performance_tier',
      });
      toast.success(res.data.message || 'Model training started in background.');
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTraining(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
      toast.success('Model deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleAutoTrain = async (event) => {
    const newValue = event.target.checked;
    setAutoTrainLoading(true);
    try {
      const res = await updateAutoTrainConfig(newValue);
      setAutoTrainEnabled(newValue);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAutoTrainLoading(false);
    }
  };

  return (
    <Box>
      <SectionHeader
        title="Model Training"
        subtitle="Train ML models to classify digital channel performance tiers"
      />

      <Grid container spacing={3}>
        {/* Auto-Train Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">Training Configuration</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Control when models are trained
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoTrainEnabled}
                    onChange={handleToggleAutoTrain}
                    disabled={autoTrainLoading}
                  />
                }
                label={autoTrainEnabled ? 'Auto-Train ON' : 'Auto-Train OFF'}
              />
            </Box>

            {autoTrainEnabled ? (
              <Alert severity="warning" sx={{ mb: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Development Mode: Auto-Training Enabled
                </Typography>
                <Typography variant="caption">
                  Models will automatically train on every data upload. This is convenient for development but may slow down uploads (~20-30 seconds). 
                  Recommended: Disable for production and use manual training.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Production Mode: Manual Training Only
                </Typography>
                <Typography variant="caption">
                  Data uploads are fast (predictions only). Train models manually using the form below or schedule training during off-peak hours.
                  This is the recommended setting for production environments.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Training Form */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PsychologyIcon sx={{ color: 'success.main', fontSize: 20 }} />
              </Box>
              <Typography variant="h6">Train New Model</Typography>
            </Box>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Dataset</InputLabel>
              <Select
                value={selectedDataset}
                label="Select Dataset"
                onChange={(e) => setSelectedDataset(e.target.value)}
              >
                {datasets.length === 0 && (
                  <MenuItem disabled value="">
                    No processed datasets available
                  </MenuItem>
                )}
                {datasets.map((ds) => (
                  <MenuItem key={ds.id} value={ds.id}>
                    <Box>
                      <Typography variant="body2">{ds.original_filename}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {ds.row_count?.toLocaleString()} rows · {ds.features_created?.length} features
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel>Model Type</InputLabel>
              <Select
                value={selectedModelType}
                label="Model Type"
                onChange={(e) => setSelectedModelType(e.target.value)}
              >
                {MODEL_TYPES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    <Box>
                      <Typography variant="body2">{m.label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{m.desc}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              fullWidth
              startIcon={training ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
              onClick={handleTrain}
              disabled={!selectedDataset || training}
            >
              {training ? 'Starting Training…' : 'Train Model'}
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
              Target: Performance Tier
            </Typography>
            {['Excellent', 'Good', 'Average', 'Poor'].map((tier) => (
              <Box key={tier} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <StatusBadge status={tier} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {tier === 'Excellent' && 'Score ≥ 75% — top performing channel'}
                  {tier === 'Good' && 'Score 55–75% — healthy channel'}
                  {tier === 'Average' && 'Score 35–55% — needs attention'}
                  {tier === 'Poor' && 'Score < 35% — critical issues'}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Models Table */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Trained Models ({models.length})
            </Typography>

            {loading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={32} />
              </Box>
            ) : models.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <PsychologyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No models trained yet. Select a dataset and start training.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Accuracy</TableCell>
                      <TableCell>F1 Score</TableCell>
                      <TableCell>Precision</TableCell>
                      <TableCell>Recall</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {models.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {m.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {new Date(m.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={m.model_type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={m.status} />
                        </TableCell>
                        <TableCell><MetricBar value={m.accuracy} color="#6366f1" /></TableCell>
                        <TableCell><MetricBar value={m.f1_score} color="#06b6d4" /></TableCell>
                        <TableCell><MetricBar value={m.precision_score} color="#10b981" /></TableCell>
                        <TableCell><MetricBar value={m.recall_score} color="#f59e0b" /></TableCell>
                        <TableCell align="right">
                          <Tooltip title="View details">
                            <Button
                              size="small"
                              onClick={() => setDrawerModel(m)}
                              sx={{ minWidth: 0, p: 0.5, mr: 0.5 }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                          <Tooltip title="Delete model">
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleDelete(m.id)}
                              sx={{ minWidth: 0, p: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </Button>
                          </Tooltip>
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

      <ModelDetailDrawer
        model={drawerModel}
        open={Boolean(drawerModel)}
        onClose={() => setDrawerModel(null)}
      />
    </Box>
  );
}

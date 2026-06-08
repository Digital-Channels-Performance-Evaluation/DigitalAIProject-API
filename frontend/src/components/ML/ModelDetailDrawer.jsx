import React from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider,
  Grid, Chip, LinearProgress, useTheme, Table,
  TableBody, TableCell, TableHead, TableRow, TableContainer,
  Alert,
} from '@mui/material';
import CloseIcon          from '@mui/icons-material/Close';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import BalanceIcon        from '@mui/icons-material/Balance';
import TimelineIcon       from '@mui/icons-material/Timeline';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import FeatureImportanceChart from './FeatureImportanceChart';
import StatusBadge        from '../common/StatusBadge';

const TIER_COLORS = { High: '#10b981', Medium: '#f59e0b', Low: '#ef4444' };

function MetricBar({ label, value, color = '#6366f1' }) {
  const pct = value != null ? Math.round(value * 100) : null;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>
          {pct != null ? `${pct}%` : '—'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate" value={pct ?? 0}
        sx={{
          height: 6, borderRadius: 3,
          bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

function InfoBox({ label, value }) {
  const theme = useTheme();
  const infoBg = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  return (
    <Grid item xs={6}>
      <Box sx={{ bgcolor: infoBg, borderRadius: 2, p: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25, color: 'text.primary' }}>
          {value ?? '—'}
        </Typography>
      </Box>
    </Grid>
  );
}

export default function ModelDetailDrawer({ model, open, onClose }) {
  if (!model) return null;
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tp     = model.training_params || {};

  const perClass    = tp.per_class_metrics   || {};
  const classWeights = tp.class_weights      || {};
  const classDist   = tp.class_distribution  || {};
  const imputed     = tp.imputed_columns     || {};
  const splitMethod = tp.split_method        || 'random';
  const tiers       = Object.keys(perClass);

  return (
    <Drawer
      anchor="right" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 500 },
          bgcolor: 'background.paper',
          borderLeft: '1px solid', borderColor: 'divider', p: 0,
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        px: 3, py: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box>
          <Typography variant="h6">{model.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip label={model.model_type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <StatusBadge status={model.status} />
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: 3, overflow: 'auto', flexGrow: 1 }}>

        {/* ── Overall Metrics ──────────────────────────────────────────── */}
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Overall Performance
        </Typography>
        <MetricRow label="Accuracy"  value={model.accuracy}        color="#6366f1" />
        <MetricRow label="F1 Score"  value={model.f1_score}        color="#06b6d4" />
        <MetricRow label="Precision" value={model.precision_score} color="#10b981" />
        <MetricRow label="Recall"    value={model.recall_score}    color="#f59e0b" />

        <Divider sx={{ my: 3 }} />

        {/* ── Per-Class Metrics (Model Comparison) ─────────────────────── */}
        {tiers.length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TimelineIcon sx={{ fontSize: 16, color: 'primary.light' }} />
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                Per-Class Evaluation
              </Typography>
            </Box>
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tier</TableCell>
                    <TableCell align="right">Precision</TableCell>
                    <TableCell align="right">Recall</TableCell>
                    <TableCell align="right">F1</TableCell>
                    <TableCell align="right">Support</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tiers.map(tier => {
                    const m = perClass[tier];
                    const color = TIER_COLORS[tier] || '#6366f1';
                    return (
                      <TableRow key={tier} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color }}>{tier}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{(m.precision * 100).toFixed(0)}%</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">{(m.recall * 100).toFixed(0)}%</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontWeight: 700, color }}>{(m.f1 * 100).toFixed(0)}%</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{m.support}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* ── Class Balance ─────────────────────────────────────────────── */}
        {Object.keys(classDist).length > 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BalanceIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                Class Balance
              </Typography>
            </Box>
            <Box sx={{ mb: 3 }}>
              {Object.entries(classDist).map(([tier, count]) => {
                const total = Object.values(classDist).reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? Math.round(count / total * 100) : 0;
                const color = TIER_COLORS[tier] || '#6366f1';
                const weight = classWeights[tier];
                return (
                  <Box key={tier} sx={{ mb: 1.25 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color }}>{tier}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          ({count} samples)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{pct}%</Typography>
                        {weight && (
                          <Chip label={`w=${weight}`} size="small"
                            sx={{ height: 16, fontSize: '0.58rem', bgcolor: color + '22', color }} />
                        )}
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 5, borderRadius: 3,
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                  </Box>
                );
              })}
            </Box>
          </>
        )}

        {/* ── No Look-Ahead Bias indicator ──────────────────────────────── */}
        <Alert
          icon={<CheckCircleIcon fontSize="small" />}
          severity={splitMethod === 'chronological' ? 'success' : 'warning'}
          sx={{ mb: 3, py: 0.5, fontSize: '0.75rem' }}
        >
          {splitMethod === 'chronological'
            ? 'Chronological split — no look-ahead bias (trained on past, tested on future)'
            : 'Random split — consider retraining with chronological split to avoid look-ahead bias'
          }
        </Alert>

        {/* ── Imputed Columns ───────────────────────────────────────────── */}
        {Object.keys(imputed).length > 0 && (
          <Alert icon={<WarningAmberIcon fontSize="small" />} severity="warning"
            sx={{ mb: 3, py: 0.5, fontSize: '0.75rem' }}>
            Missing values imputed (median): {Object.entries(imputed).map(([col, n]) => `${col} (${n})`).join(', ')}
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        {/* ── Training Info ─────────────────────────────────────────────── */}
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Training Info
        </Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <InfoBox label="Model Type"  value={model.model_type} />
          <InfoBox label="Target"      value={model.target} />
          <InfoBox label="Samples"     value={tp.n_samples?.toLocaleString()} />
          <InfoBox label="Features"    value={tp.n_features} />
          <InfoBox label="Test Split"  value={tp.test_size ? `${tp.test_size * 100}%` : null} />
          <InfoBox label="Split Method" value={splitMethod === 'chronological' ? '📅 Chronological' : '🎲 Random'} />
          <InfoBox label="Trained"     value={model.created_at ? new Date(model.created_at).toLocaleDateString() : null} />
          <InfoBox label="Tiers"       value={tp.tiers?.join(' / ')} />
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* ── Feature Importance ────────────────────────────────────────── */}
        <FeatureImportanceChart importance={model.feature_importance} />

      </Box>
    </Drawer>
  );
}

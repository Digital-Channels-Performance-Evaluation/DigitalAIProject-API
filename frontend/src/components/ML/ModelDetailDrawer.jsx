import React from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider,
  Grid, Chip, LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FeatureImportanceChart from './FeatureImportanceChart';
import StatusBadge from '../common/StatusBadge';

function MetricRow({ label, value, color = '#6366f1' }) {
  const pct = value != null ? Math.round(value * 100) : null;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>
          {pct != null ? `${pct}%` : '—'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct ?? 0}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.08)',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

export default function ModelDetailDrawer({ model, open, onClose }) {
  if (!model) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6">{model.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip label={model.model_type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <StatusBadge status={model.status} />
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 3, overflow: 'auto', flexGrow: 1 }}>
        {/* Performance Metrics */}
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Performance Metrics
        </Typography>

        <MetricRow label="Accuracy" value={model.accuracy} color="#6366f1" />
        <MetricRow label="F1 Score" value={model.f1_score} color="#06b6d4" />
        <MetricRow label="Precision" value={model.precision_score} color="#10b981" />
        <MetricRow label="Recall" value={model.recall_score} color="#f59e0b" />

        <Divider sx={{ my: 3 }} />

        {/* Training Info */}
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Training Info
        </Typography>

        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[
            { label: 'Model Type', value: model.model_type },
            { label: 'Target', value: model.target },
            { label: 'Samples', value: model.training_params?.n_samples?.toLocaleString() },
            { label: 'Features', value: model.training_params?.n_features },
            { label: 'Test Split', value: model.training_params?.test_size ? `${model.training_params.test_size * 100}%` : null },
            { label: 'Trained', value: model.created_at ? new Date(model.created_at).toLocaleDateString() : null },
          ].map(({ label, value }) => (
            <Grid item xs={6} key={label}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                  {value ?? '—'}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Feature Importance */}
        <FeatureImportanceChart importance={model.feature_importance} />
      </Box>
    </Drawer>
  );
}

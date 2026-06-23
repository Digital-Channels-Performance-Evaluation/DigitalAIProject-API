import React from 'react';
import {
  Box, Typography, Chip, Grid, Divider, Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';

export default function ValidationReport({ report, featuresCreated }) {
  if (!report) return null;

  const { is_valid, errors = [], warnings = [], row_count, column_count, date_range, missing_values = {} } = report;

  const missingEntries = Object.entries(missing_values).filter(([, v]) => v > 0);

  return (
    <Box>
      {/* Overall status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {is_valid ? (
          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
        ) : (
          <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
        )}
        <Typography variant="subtitle2" sx={{ color: is_valid ? 'success.main' : 'error.main' }}>
          {is_valid ? 'Validation Passed' : 'Validation Failed'}
        </Typography>
      </Box>

      {/* Errors */}
      {errors.map((e, i) => (
        <Alert key={i} severity="error" sx={{ mb: 1, py: 0.5 }}>{e}</Alert>
      ))}

      {/* Warnings */}
      {warnings.map((w, i) => (
        <Alert key={i} severity="warning" sx={{ mb: 1, py: 0.5 }}>{w}</Alert>
      ))}

      {/* Stats grid */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: 'Rows', value: row_count?.toLocaleString() },
          { label: 'Columns', value: column_count },
          { label: 'Date From', value: date_range?.min ? new Date(date_range.min).toLocaleDateString() : '—' },
          { label: 'Date To', value: date_range?.max ? new Date(date_range.max).toLocaleDateString() : '—' },
        ].map(({ label, value }) => (
          <Grid item xs={6} key={label}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5, p: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{value ?? '—'}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Missing values */}
      {missingEntries.length > 0 && (
        <>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Missing Values
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {missingEntries.map(([col, count]) => (
              <Chip
                key={col}
                label={`${col}: ${count}`}
                size="small"
                color="warning"
                variant="outlined"
                icon={<WarningAmberIcon />}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </>
      )}

      {/* Features created */}
      {featuresCreated?.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            {featuresCreated.length} Features Engineered
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {featuresCreated.map((f) => (
              <Chip
                key={f}
                label={f}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.65rem' }}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

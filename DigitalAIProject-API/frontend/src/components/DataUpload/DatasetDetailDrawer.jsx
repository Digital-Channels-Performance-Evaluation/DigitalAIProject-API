import React from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ValidationReport from './ValidationReport';
import StatusBadge from '../common/StatusBadge';

export default function DatasetDetailDrawer({ dataset, open, onClose }) {
  if (!dataset) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 460 },
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
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
          <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>
            {dataset.original_filename}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip label={dataset.file_type?.toUpperCase()} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <StatusBadge status={dataset.status} />
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 3, overflow: 'auto' }}>
        {/* File info */}
        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          File Info
        </Typography>
        {[
          { label: 'Size', value: `${dataset.file_size_kb} KB` },
          { label: 'Uploaded', value: dataset.uploaded_at ? new Date(dataset.uploaded_at).toLocaleString() : '—' },
          { label: 'Processed', value: dataset.processed_at ? new Date(dataset.processed_at).toLocaleString() : '—' },
          { label: 'Stored as', value: dataset.filename },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>
              {value}
            </Typography>
          </Box>
        ))}

        {dataset.error_message && (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(239,68,68,0.08)', borderRadius: 2, border: '1px solid rgba(239,68,68,0.2)' }}>
            <Typography variant="caption" sx={{ color: 'error.light' }}>
              {dataset.error_message}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2.5 }} />

        {/* Validation report */}
        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Validation & Features
        </Typography>
        <ValidationReport
          report={dataset.validation_report}
          featuresCreated={dataset.features_created}
        />
      </Box>
    </Drawer>
  );
}

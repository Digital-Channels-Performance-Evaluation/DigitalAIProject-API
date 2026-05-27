import React, { useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import DataUploader from '../components/DataUpload/DataUploader';
import DatasetDetailDrawer from '../components/DataUpload/DatasetDetailDrawer';
import SectionHeader from '../components/common/SectionHeader';

export default function DataManagement() {
  const [selectedDataset, setSelectedDataset] = useState(null);

  return (
    <Box>
      <SectionHeader
        title="Data Management"
        subtitle="Upload datasets, trigger feature engineering, and manage your data pipeline"
      />

      <Grid container spacing={3}>
        {/* Upload Panel */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'rgba(99,102,241,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StorageIcon sx={{ color: 'primary.light', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6">Upload Dataset</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Drag & drop or browse — feature engineering runs automatically
                </Typography>
              </Box>
            </Box>

            <DataUploader
              onUploadComplete={() => {}}
              onDatasetClick={(ds) => setSelectedDataset(ds)}
            />
          </Paper>
        </Grid>

        {/* Info Panel */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Expected Data Format
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Your dataset should include these columns:
            </Typography>
            {[
              { col: 'product_id', desc: 'Channel identifier' },
              { col: 'metric_date', desc: 'Date of the metric (YYYY-MM-DD)' },
              { col: 'total_users', desc: 'Total registered users' },
              { col: 'active_users', desc: 'Monthly active users' },
              { col: 'transaction_count', desc: 'Number of transactions' },
              { col: 'transaction_value', desc: 'Total transaction value' },
              { col: 'revenue', desc: 'Revenue generated' },
              { col: 'failed_transactions', desc: 'Failed transaction count' },
              { col: 'complaints', desc: 'Customer complaints' },
              { col: 'downtime_minutes', desc: 'System downtime (minutes)' },
              { col: 'fraud_incidents', desc: 'Fraud incidents detected' },
            ].map(({ col, desc }) => (
              <Box key={col} sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'rgba(99,102,241,0.1)',
                    color: 'primary.light',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                >
                  {col}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {desc}
                </Typography>
              </Box>
            ))}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Auto-Generated Features
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              The pipeline automatically engineers:
            </Typography>
            {[
              'User & revenue growth rates',
              'Failure & fraud rates',
              'Uptime percentage',
              'Active user ratio',
              'Retention rate',
              'Revenue per user',
              '7-day rolling averages',
              'Operational risk score',
            ].map((f) => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.light', flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {f}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <DatasetDetailDrawer
        dataset={selectedDataset}
        open={Boolean(selectedDataset)}
        onClose={() => setSelectedDataset(null)}
      />
    </Box>
  );
}

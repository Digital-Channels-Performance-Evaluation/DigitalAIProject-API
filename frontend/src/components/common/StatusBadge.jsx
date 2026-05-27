import React from 'react';
import { Chip } from '@mui/material';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'default'  },
  processing: { label: 'Processing', color: 'warning'  },
  completed:  { label: 'Completed',  color: 'success'  },
  failed:     { label: 'Failed',     color: 'error'    },
  training:   { label: 'Training',   color: 'warning'  },
  ready:      { label: 'Ready',      color: 'success'  },
  active:     { label: 'Active',     color: 'success'  },
  // Performance tiers
  Excellent:  { label: 'Excellent',  color: 'success'  },
  Good:       { label: 'Good',       color: 'primary'  },
  Average:    { label: 'Average',    color: 'warning'  },
  Poor:       { label: 'Poor',       color: 'error'    },
};

export default function StatusBadge({ status, size = 'small' }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
    />
  );
}

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, TextField, InputAdornment,
  Button, Divider,
} from '@mui/material';
import SearchIcon        from '@mui/icons-material/Search';
import RefreshIcon       from '@mui/icons-material/Refresh';
import UploadFileIcon    from '@mui/icons-material/UploadFile';
import PsychologyIcon    from '@mui/icons-material/Psychology';
import LoginIcon         from '@mui/icons-material/Login';
import AutoFixHighIcon   from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import { getAuditLog }   from '../api/endpoints';
import SectionHeader     from '../components/common/SectionHeader';

const ACTION_CONFIG = {
  dataset_uploaded:        { icon: <UploadFileIcon   sx={{ fontSize: 16 }} />, color: '#6366f1', label: 'Upload'    },
  feature_engineering:     { icon: <AutoFixHighIcon  sx={{ fontSize: 16 }} />, color: '#06b6d4', label: 'Processing'},
  model_training_started:  { icon: <PsychologyIcon   sx={{ fontSize: 16 }} />, color: '#f59e0b', label: 'Training'  },
  model_ready:             { icon: <CheckCircleIcon  sx={{ fontSize: 16 }} />, color: '#10b981', label: 'Model'     },
  user_login:              { icon: <LoginIcon        sx={{ fontSize: 16 }} />, color: '#94a3b8', label: 'Login'     },
};

function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] || { color: '#94a3b8', label: action };
  return (
    <Chip
      icon={cfg.icon}
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.color + '22',
        color: cfg.color,
        fontWeight: 600,
        fontSize: '0.65rem',
        border: `1px solid ${cfg.color}44`,
        '& .MuiChip-icon': { color: cfg.color },
      }}
    />
  );
}

export default function AuditLog() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [limit,   setLimit]   = useState(50);

  const load = () => {
    setLoading(true);
    getAuditLog(limit)
      .then(r => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [limit]);

  const filtered = events.filter(e => {
    const matchSearch = !search || e.detail?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.action?.startsWith(filter);
    return matchSearch && matchFilter;
  });

  // Summary counts
  const counts = events.reduce((acc, e) => {
    const key = ACTION_CONFIG[e.action]?.label || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box>
      <SectionHeader
        title="Audit Log"
        subtitle="Complete history of platform actions — uploads, training, logins"
        action={
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={load}>
            Refresh
          </Button>
        }
      />

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([label, count]) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75,
            bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, px: 1.5, py: 0.75,
            border: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{count}</Typography>
          </Box>
        ))}
      </Box>

      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        {/* Filters */}
        <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Search events…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ width: 240 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Filter by type</InputLabel>
            <Select value={filter} label="Filter by type" onChange={e => setFilter(e.target.value)}>
              <MenuItem value="all">All Events</MenuItem>
              <MenuItem value="dataset">Uploads</MenuItem>
              <MenuItem value="feature">Processing</MenuItem>
              <MenuItem value="model">Model Training</MenuItem>
              <MenuItem value="user">Logins</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Show</InputLabel>
            <Select value={limit} label="Show" onChange={e => setLimit(e.target.value)}>
              {[25, 50, 100, 200].map(n => <MenuItem key={n} value={n}>{n} events</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
            {filtered.length} of {events.length} events
          </Typography>
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 160 }}>Timestamp</TableCell>
                  <TableCell sx={{ width: 120 }}>Action</TableCell>
                  <TableCell sx={{ width: 100 }}>Entity</TableCell>
                  <TableCell>Detail</TableCell>
                  <TableCell sx={{ width: 100 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((e, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                        {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell><ActionBadge action={e.action} /></TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {e.entity} #{e.entity_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>{e.detail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={e.status}
                        size="small"
                        sx={{
                          fontSize: '0.65rem', fontWeight: 600,
                          bgcolor: e.status === 'completed' || e.status === 'ready' || e.status === 'active'
                            ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                          color: e.status === 'completed' || e.status === 'ready' || e.status === 'active'
                            ? 'success.main' : 'text.secondary',
                        }}
                      />
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

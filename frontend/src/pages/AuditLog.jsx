import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, TextField, InputAdornment,
  Button, Divider, IconButton, Tooltip, Stack,
} from '@mui/material';
import SearchIcon          from '@mui/icons-material/Search';
import RefreshIcon         from '@mui/icons-material/Refresh';
import UploadFileIcon      from '@mui/icons-material/UploadFile';
import PsychologyIcon      from '@mui/icons-material/Psychology';
import LoginIcon           from '@mui/icons-material/Login';
import AutoFixHighIcon     from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import FirstPageIcon       from '@mui/icons-material/FirstPage';
import LastPageIcon        from '@mui/icons-material/LastPage';
import ChevronLeftIcon     from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon    from '@mui/icons-material/ChevronRight';
import { getAuditLog }     from '../api/endpoints';
import SectionHeader       from '../components/common/SectionHeader';

const ACTION_CONFIG = {
  dataset_uploaded:       { icon: <UploadFileIcon  sx={{ fontSize: 16 }} />, color: '#6366f1', label: 'Upload'     },
  feature_engineering:    { icon: <AutoFixHighIcon sx={{ fontSize: 16 }} />, color: '#06b6d4', label: 'Processing' },
  model_training_started: { icon: <PsychologyIcon  sx={{ fontSize: 16 }} />, color: '#f59e0b', label: 'Training'   },
  model_ready:            { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: '#10b981', label: 'Model'      },
  user_login:             { icon: <LoginIcon       sx={{ fontSize: 16 }} />, color: '#94a3b8', label: 'Login'      },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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

function StatusChip({ status }) {
  const isGood = ['completed', 'ready', 'active'].includes(status);
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        fontSize: '0.65rem', fontWeight: 600,
        bgcolor: isGood ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
        color:   isGood ? 'success.main'          : 'text.secondary',
      }}
    />
  );
}

export default function AuditLog() {
  const [events,     setEvents]     = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);

  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(20);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getAuditLog(page, pageSize, filter)
      .then(r => {
        setEvents(r.data.events || []);
        setTotal(r.data.total || 0);
        setTotalPages(r.data.total_pages || 1);
      })
      .catch(() => { setEvents([]); setTotal(0); setTotalPages(1); })
      .finally(() => setLoading(false));
  }, [page, pageSize, filter]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filter or page size changes
  const handleFilterChange = (val) => { setFilter(val); setPage(1); };
  const handlePageSizeChange = (val) => { setPageSize(val); setPage(1); };

  // Client-side search on current page
  const displayed = search
    ? events.filter(e => e.detail?.toLowerCase().includes(search.toLowerCase()))
    : events;

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

      <Paper sx={{ overflow: 'hidden' }}>
        {/* ── Filters bar ─────────────────────────────────────────────── */}
        <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search on this page…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 220 }}
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Event type</InputLabel>
            <Select value={filter} label="Event type" onChange={e => handleFilterChange(e.target.value)}>
              <MenuItem value="all">All Events</MenuItem>
              <MenuItem value="dataset">Uploads</MenuItem>
              <MenuItem value="feature">Processing</MenuItem>
              <MenuItem value="model">Model Training</MenuItem>
              <MenuItem value="user">Logins</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Per page</InputLabel>
            <Select value={pageSize} label="Per page" onChange={e => handlePageSizeChange(e.target.value)}>
              {PAGE_SIZE_OPTIONS.map(n => (
                <MenuItem key={n} value={n}>{n} rows</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
            {total.toLocaleString()} total events
          </Typography>
        </Box>

        <Divider />

        {/* ── Table ───────────────────────────────────────────────────── */}
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : displayed.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>No events found.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 160 }}>Timestamp</TableCell>
                  <TableCell sx={{ width: 120 }}>Action</TableCell>
                  <TableCell sx={{ width: 110 }}>Entity</TableCell>
                  <TableCell>Detail</TableCell>
                  <TableCell sx={{ width: 110 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.map((e, idx) => (
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
                    <TableCell><StatusChip status={e.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Divider />

        {/* ── Pagination controls ──────────────────────────────────────── */}
        <Box sx={{
          px: 3, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 1,
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            {' '}·{' '}
            showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
          </Typography>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="First page">
              <span>
                <IconButton size="small" onClick={() => setPage(1)} disabled={page === 1}>
                  <FirstPageIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Previous page">
              <span>
                <IconButton size="small" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <Button
                  key={p}
                  size="small"
                  variant={p === page ? 'contained' : 'text'}
                  onClick={() => setPage(p)}
                  sx={{
                    minWidth: 32, height: 32, p: 0,
                    fontSize: '0.75rem',
                    ...(p !== page && { color: 'text.secondary' }),
                  }}
                >
                  {p}
                </Button>
              );
            })}

            <Tooltip title="Next page">
              <span>
                <IconButton size="small" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Last page">
              <span>
                <IconButton size="small" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  <LastPageIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

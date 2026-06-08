import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Box, Chip, Tooltip,
  Badge, Popover, List, ListItem, ListItemText, ListItemIcon,
  Divider, Button,
} from '@mui/material';
import MenuIcon            from '@mui/icons-material/Menu';
import DarkModeIcon        from '@mui/icons-material/DarkMode';
import LightModeIcon       from '@mui/icons-material/LightMode';
import NotificationsIcon   from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import TrendingDownIcon    from '@mui/icons-material/TrendingDown';
import ArrowForwardIcon    from '@mui/icons-material/ArrowForward';
import { useAuth }         from '../../context/AuthContext';
import { useThemeMode }    from '../../context/ThemeContext';
import { useAlerts }       from '../../context/AlertContext';

const PAGE_TITLES = {
  '/dashboard':   { title: 'Dashboard',        subtitle: 'Overview & KPIs' },
  '/data':        { title: 'Data Management',  subtitle: 'Upload & process datasets' },
  '/models':      { title: 'Model Training',   subtitle: 'Train & evaluate ML models' },
  '/predictions': { title: 'Predictions',      subtitle: 'Channel performance predictions' },
  '/ranking':     { title: 'Channel Ranking',  subtitle: 'ML-powered performance leaderboard' },
  '/analytics':   { title: 'Analytics',        subtitle: 'Confusion matrix, data profiling & trends' },
  '/report':      { title: 'Smart Report',     subtitle: 'AI-generated performance report' },
  '/audit':       { title: 'Audit Log',        subtitle: 'Platform activity history' },
  '/profile':     { title: 'My Profile',       subtitle: 'Account settings & password' },
  '/users':       { title: 'User Management',  subtitle: 'Manage platform users & roles' },
};

const ROLE_COLORS = {
  admin:             'error',
  executive_manager: 'secondary',
  manager:           'primary',
  officer:           'info',
};

const ROLE_LABELS = {
  admin:             'Admin',
  executive_manager: 'Exec. Manager',
  manager:           'Manager',
  officer:           'Officer',
};

export default function TopBar({ onMenuClick }) {
  const location    = useLocation();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { alerts, totalCount, markSeen } = useAlerts();
  const page        = PAGE_TITLES[location.pathname] || { title: 'Digital Channels', subtitle: '' };

  const [anchorEl, setAnchorEl] = useState(null);

  const handleBellClick = (e) => {
    setAnchorEl(e.currentTarget);
    markSeen(); // mark as seen — clears badge count
  };
  const handleClose = () => setAnchorEl(null);
  const open = Boolean(anchorEl);

  const goToRanking = () => {
    handleClose();
    navigate('/ranking');
  };

  return (
    <AppBar
      position="sticky" elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' }}
    >
      <Toolbar sx={{ gap: 1.5 }}>
        <IconButton edge="start" onClick={onMenuClick}
          sx={{ display: { md: 'none' }, color: 'text.secondary' }}>
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.2, color: 'text.primary' }}>
            {page.title}
          </Typography>
          {page.subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {page.subtitle}
            </Typography>
          )}
        </Box>

        {/* Theme toggle */}
        <Tooltip title={mode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}>
          <IconButton onClick={toggleTheme} size="small" sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* ── Notification Bell ─────────────────────────────────────── */}
        <Tooltip title={totalCount > 0 ? `${totalCount} channel${totalCount > 1 ? 's' : ''} need attention` : 'No alerts'}>
          <IconButton size="small" onClick={handleBellClick}
            sx={{ color: totalCount > 0 ? 'error.main' : 'text.secondary' }}>
            <Badge
              badgeContent={alerts.unseen ? totalCount : 0}
              color="error"
              max={9}
              sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 15, minWidth: 15 } }}
            >
              {totalCount > 0
                ? <NotificationsIcon fontSize="small" />
                : <NotificationsNoneIcon fontSize="small" />
              }
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Notification popover */}
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { width: 320, mt: 1 } }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Channel Alerts
            </Typography>
            {totalCount > 0 && (
              <Chip label={`${totalCount} active`} size="small" color="error"
                sx={{ height: 18, fontSize: '0.6rem' }} />
            )}
          </Box>
          <Divider />

          {totalCount === 0 ? (
            <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                All channels are performing well
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {alerts.lowChannels.map(ch => (
                <ListItem key={ch.product_id} sx={{ px: 2, py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {ch.product_id}
                        </Typography>
                        <Chip label="Low" size="small" color="error"
                          sx={{ height: 16, fontSize: '0.6rem' }} />
                      </Box>
                    }
                    secondary={`Score: ${ch.score} — immediate action required`}
                    secondaryTypographyProps={{ sx: { fontSize: '0.7rem', color: 'text.secondary' } }}
                  />
                </ListItem>
              ))}

              {alerts.decliningChannels.map(ch => (
                <ListItem key={`d-${ch.product_id}`} sx={{ px: 2, py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TrendingDownIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {ch.product_id}
                        </Typography>
                        <Chip label="Declining" size="small" color="warning"
                          sx={{ height: 16, fontSize: '0.6rem' }} />
                      </Box>
                    }
                    secondary={`Score: ${ch.score} — monitor closely`}
                    secondaryTypographyProps={{ sx: { fontSize: '0.7rem', color: 'text.secondary' } }}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Button fullWidth size="small" endIcon={<ArrowForwardIcon fontSize="small" />}
              onClick={goToRanking} sx={{ fontSize: '0.72rem' }}>
              View Channel Rankings
            </Button>
          </Box>
        </Popover>

        {/* Role chip */}
        {user && (
          <Chip
            label={ROLE_LABELS[user.role] || user.role}
            color={ROLE_COLORS[user.role] || 'default'}
            size="small"
            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, '& .MuiChip-label': { px: 1 } }}
          />
        )}

        <Chip
          label="Live" size="small" color="success"
          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, '& .MuiChip-label': { px: 1 } }}
        />
      </Toolbar>
    </AppBar>
  );
}

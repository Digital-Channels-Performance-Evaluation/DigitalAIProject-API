import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Box, Chip, Tooltip } from '@mui/material';
import MenuIcon        from '@mui/icons-material/Menu';
import DarkModeIcon    from '@mui/icons-material/DarkMode';
import LightModeIcon   from '@mui/icons-material/LightMode';
import { useAuth }      from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';

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

const ROLE_COLORS = { admin: 'error', analyst: 'primary', viewer: 'default' };

export default function TopBar({ onMenuClick }) {
  const location = useLocation();
  const { user } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const page = PAGE_TITLES[location.pathname] || { title: 'Digital Channels', subtitle: '' };

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
            {mode === 'dark'
              ? <LightModeIcon fontSize="small" />
              : <DarkModeIcon  fontSize="small" />
            }
          </IconButton>
        </Tooltip>

        {user && (
          <Chip
            label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            color={ROLE_COLORS[user.role]}
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

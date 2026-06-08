import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Tooltip, IconButton,
} from '@mui/material';
import DashboardIcon     from '@mui/icons-material/Dashboard';
import StorageIcon       from '@mui/icons-material/Storage';
import PsychologyIcon    from '@mui/icons-material/Psychology';
import InsightsIcon      from '@mui/icons-material/Insights';
import ShowChartIcon     from '@mui/icons-material/ShowChart';
import PeopleIcon        from '@mui/icons-material/People';
import LeaderboardIcon   from '@mui/icons-material/Leaderboard';
import BarChartIcon      from '@mui/icons-material/BarChart';
import AssessmentIcon    from '@mui/icons-material/Assessment';
import HistoryIcon       from '@mui/icons-material/History';
import LogoutIcon        from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from '../../context/AuthContext';
import { DATA_ROLES } from '../../App';

// ── Role display config ───────────────────────────────────────────────────────
const ROLE_META = {
  admin:             { label: 'Admin',             color: '#ef4444' },
  executive_manager: { label: 'Executive Manager', color: '#8b5cf6' },
  manager:           { label: 'Manager',           color: '#6366f1' },
  officer:           { label: 'Officer',           color: '#06b6d4' },
};

// ── Nav items visible to ALL authenticated roles ──────────────────────────────
const GENERAL_NAV = [
  { label: 'Dashboard',       icon: <DashboardIcon   />, path: '/dashboard'   },
  { label: 'Predictions',     icon: <InsightsIcon    />, path: '/predictions' },
  { label: 'Channel Ranking', icon: <LeaderboardIcon />, path: '/ranking'     },
  { label: 'Analytics',       icon: <BarChartIcon    />, path: '/analytics'   },
  { label: 'Smart Report',    icon: <AssessmentIcon  />, path: '/report'      },
];

// ── Nav items visible to data roles (admin, manager, officer) ─────────────────
const DATA_NAV = [
  { label: 'Data Management', icon: <StorageIcon    />, path: '/data'   },
  { label: 'Model Training',  icon: <PsychologyIcon />, path: '/models' },
];

// ── Admin-only items ──────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { label: 'User Management', icon: <PeopleIcon  />, path: '/users' },
  { label: 'Audit Log',       icon: <HistoryIcon />, path: '/audit' },
];

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleNav    = (path) => { navigate(path); onClose?.(); };
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const isAdmin    = user?.role === 'admin';
  const hasData    = DATA_ROLES.includes(user?.role);
  const roleMeta   = ROLE_META[user?.role] || { label: user?.role, color: '#94a3b8' };

  const NavItem = ({ item }) => {
    const active = location.pathname === item.path;
    return (
      <ListItemButton
        onClick={() => handleNav(item.path)}
        sx={{
          borderRadius: 2, mb: 0.5, px: 1.5, py: 0.9,
          color: active ? 'primary.light' : 'text.secondary',
          bgcolor: active ? 'rgba(99,102,241,0.12)' : 'transparent',
          '&:hover': {
            bgcolor: active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.04)',
            color: 'text.primary',
          },
          transition: 'all 0.15s ease',
        }}
      >
        <ListItemIcon sx={{ minWidth: 34, color: active ? 'primary.light' : 'text.secondary' }}>
          {React.cloneElement(item.icon, { sx: { fontSize: 19 } })}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400 }}
        />
        {active && (
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.light' }} />
        )}
      </ListItemButton>
    );
  };

  return (
    <Box sx={{
      width: 260, height: '100vh',
      bgcolor: 'background.paper',
      borderRight: '1px solid', borderColor: 'divider',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: 2,
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShowChartIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', lineHeight: 1.2, fontWeight: 700, fontSize: '0.9rem' }}>
              DigitalPerf
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              ML Evaluation Platform
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ px: 1.5, py: 1.5, flexGrow: 1, overflow: 'auto' }}>

        {/* All roles */}
        {GENERAL_NAV.map(item => <NavItem key={item.path} item={item} />)}

        {/* Data roles: admin, manager, officer */}
        {hasData && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" sx={{
              px: 1.5, color: 'text.secondary',
              textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.08em',
              display: 'block', mb: 0.5,
            }}>
              Data & Models
            </Typography>
            {DATA_NAV.map(item => <NavItem key={item.path} item={item} />)}
          </>
        )}

        {/* Admin only */}
        {isAdmin && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" sx={{
              px: 1.5, color: 'text.secondary',
              textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.08em',
              display: 'block', mb: 0.5,
            }}>
              Administration
            </Typography>
            {ADMIN_NAV.map(item => <NavItem key={item.path} item={item} />)}
          </>
        )}
      </List>

      <Divider />

      {/* User profile + logout */}
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={user?.avatar_url ? `http://localhost:8000${user.avatar_url}` : undefined}
            onClick={() => handleNav('/profile')}
            sx={{
              width: 32, height: 32, fontSize: '0.72rem', fontWeight: 700,
              bgcolor: 'rgba(99,102,241,0.2)', color: 'primary.light',
              cursor: 'pointer', '&:hover': { opacity: 0.85 },
            }}
          >
            {!user?.avatar_url && user?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleNav('/profile')}>
            <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', fontWeight: 600, fontSize: '0.78rem' }} noWrap>
              {user?.full_name}
            </Typography>
            <Typography variant="caption" sx={{ color: roleMeta.color, fontSize: '0.62rem' }}>
              {roleMeta.label}
            </Typography>
          </Box>
          <Tooltip title="My Profile">
            <IconButton size="small" onClick={() => handleNav('/profile')} sx={{ color: 'text.secondary' }}>
              <AccountCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

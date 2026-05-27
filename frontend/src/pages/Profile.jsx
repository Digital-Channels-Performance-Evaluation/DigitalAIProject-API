import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button,
  Avatar, Divider, CircularProgress, Chip,
  InputAdornment, IconButton,
} from '@mui/material';
import SaveIcon       from '@mui/icons-material/Save';
import LockIcon       from '@mui/icons-material/Lock';
import PersonIcon     from '@mui/icons-material/Person';
import Visibility     from '@mui/icons-material/Visibility';
import VisibilityOff  from '@mui/icons-material/VisibilityOff';
import api            from '../api/axiosConfig';
import { useAuth }    from '../context/AuthContext';
import { useToast }   from '../context/ToastContext';
import SectionHeader  from '../components/common/SectionHeader';

const ROLE_COLORS = { admin: '#ef4444', analyst: '#6366f1', viewer: '#94a3b8' };

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [name,    setName]    = useState(user?.full_name || '');
  const [email,   setEmail]   = useState(user?.email    || '');
  const [saving,  setSaving]  = useState(false);

  // Sync fields when user object loads (e.g. on page refresh)
  useEffect(() => {
    if (user) {
      setName(user.full_name || '');
      setEmail(user.email    || '');
    }
  }, [user]);

  const [curPwd,    setCurPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confPwd,   setConfPwd]   = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/auth/me', { full_name: name, email });
      await refreshUser();
      toast.success('Profile updated successfully.');
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confPwd) { toast.error('New passwords do not match.'); return; }
    if (newPwd.length < 8)  { toast.error('Password must be at least 8 characters.'); return; }
    setPwdSaving(true);
    try {
      await api.put('/auth/me/password', { current_password: curPwd, new_password: newPwd });
      toast.success('Password changed successfully.');
      setCurPwd(''); setNewPwd(''); setConfPwd('');
    } catch (e) {
      toast.error(e.message);
    } finally { setPwdSaving(false); }
  };

  return (
    <Box>
      <SectionHeader title="My Profile" subtitle="Manage your account details and password" />

      <Grid container spacing={3}>
        {/* Profile card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar sx={{
              width: 80, height: 80, fontSize: '1.5rem', fontWeight: 700,
              bgcolor: 'rgba(99,102,241,0.2)', color: 'primary.light',
              mx: 'auto', mb: 2,
            }}>
              {initials(user?.full_name)}
            </Avatar>
            <Typography variant="h6">{user?.full_name}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>{user?.email}</Typography>
            <Chip
              label={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              size="small"
              sx={{
                bgcolor: ROLE_COLORS[user?.role] + '22',
                color: ROLE_COLORS[user?.role],
                fontWeight: 700, fontSize: '0.75rem',
              }}
            />
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'left' }}>
              {[
                { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
                { label: 'Last login',   value: user?.last_login  ? new Date(user.last_login).toLocaleString()    : 'Never' },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.primary' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {/* Edit profile */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <PersonIcon sx={{ color: 'primary.light' }} />
              <Typography variant="h6">Edit Profile</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Full Name"
                  value={name} onChange={e => setName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Email Address" type="email"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2.5 }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveProfile} disabled={saving || !name || !email}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </Paper>

          {/* Change password */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <LockIcon sx={{ color: 'warning.main' }} />
              <Typography variant="h6">Change Password</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Current Password"
                  type={showCur ? 'text' : 'password'}
                  value={curPwd} onChange={e => setCurPwd(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowCur(v => !v)} edge="end">
                          {showCur ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="New Password"
                  type={showNew ? 'text' : 'password'}
                  value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNew(v => !v)} edge="end">
                          {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Confirm New Password"
                  type={showConf ? 'text' : 'password'}
                  value={confPwd} onChange={e => setConfPwd(e.target.value)}
                  error={confPwd.length > 0 && newPwd !== confPwd}
                  helperText={confPwd.length > 0 && newPwd !== confPwd ? 'Passwords do not match' : ''}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowConf(v => !v)} edge="end">
                          {showConf ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2.5 }}>
              <Button variant="outlined" color="warning"
                startIcon={pwdSaving ? <CircularProgress size={14} color="inherit" /> : <LockIcon />}
                onClick={handleChangePassword}
                disabled={pwdSaving || !curPwd || !newPwd || !confPwd}>
                {pwdSaving ? 'Updating…' : 'Update Password'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

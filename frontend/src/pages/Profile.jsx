import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button,
  Avatar, Divider, CircularProgress, Chip,
  InputAdornment, IconButton, Tooltip,
} from '@mui/material';
import SaveIcon       from '@mui/icons-material/Save';
import LockIcon       from '@mui/icons-material/Lock';
import PersonIcon     from '@mui/icons-material/Person';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon     from '@mui/icons-material/Delete';
import Visibility     from '@mui/icons-material/Visibility';
import VisibilityOff  from '@mui/icons-material/VisibilityOff';
import api            from '../api/axiosConfig';
import { uploadAvatar, deleteAvatar } from '../api/endpoints';
import { useAuth }    from '../context/AuthContext';
import { useToast }   from '../context/ToastContext';
import SectionHeader  from '../components/common/SectionHeader';

const ROLE_COLORS = { admin: '#ef4444', analyst: '#6366f1', viewer: '#94a3b8' };

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const toast   = useToast();
  const fileRef = useRef();

  const [name,    setName]    = useState(user?.full_name || '');
  const [email,   setEmail]   = useState(user?.email    || '');
  const [saving,  setSaving]  = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) { setName(user.full_name || ''); setEmail(user.email || ''); }
  }, [user]);

  const [curPwd,    setCurPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confPwd,   setConfPwd]   = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarClick = () => fileRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024)    { toast.error('Image must be under 2 MB.');    return; }

    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await uploadAvatar(fd);
      await refreshUser();
      toast.success('Profile photo updated.');
    } catch (e) {
      toast.error(e.message || 'Upload failed.');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    try {
      await deleteAvatar();
      await refreshUser();
      toast.success('Profile photo removed.');
    } catch (e) {
      toast.error(e.message);
    } finally { setAvatarUploading(false); }
  };

  // ── Profile save ──────────────────────────────────────────────────────────
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

  // ── Password change ───────────────────────────────────────────────────────
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

  // Avatar src — use backend URL if set, else null (shows initials)
  const avatarSrc = user?.avatar_url ? `http://localhost:8000${user.avatar_url}` : null;

  return (
    <Box>
      <SectionHeader title="My Profile" subtitle="Manage your account details and password" />

      <Grid container spacing={3}>
        {/* ── Profile card ──────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>

            {/* Avatar with camera overlay */}
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <Avatar
                src={avatarSrc || undefined}
                sx={{
                  width: 100, height: 100, fontSize: '1.8rem', fontWeight: 700,
                  bgcolor: 'rgba(99,102,241,0.2)', color: 'primary.light',
                  border: '3px solid',
                  borderColor: 'divider',
                }}
              >
                {!avatarSrc && initials(user?.full_name)}
              </Avatar>

              {/* Camera button overlay */}
              <Tooltip title="Change photo">
                <IconButton
                  onClick={handleAvatarClick}
                  disabled={avatarUploading}
                  size="small"
                  sx={{
                    position: 'absolute', bottom: 0, right: 0,
                    bgcolor: 'primary.main', color: '#fff',
                    width: 30, height: 30,
                    '&:hover': { bgcolor: 'primary.dark' },
                    boxShadow: 2,
                  }}
                >
                  {avatarUploading
                    ? <CircularProgress size={14} color="inherit" />
                    : <PhotoCameraIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </Box>

            <Typography variant="h6">{user?.full_name}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              {user?.email}
            </Typography>

            <Chip
              label={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              size="small"
              sx={{
                bgcolor: ROLE_COLORS[user?.role] + '22',
                color: ROLE_COLORS[user?.role],
                fontWeight: 700, fontSize: '0.75rem',
              }}
            />

            {/* Remove photo button (only if photo exists) */}
            {user?.avatar_url && (
              <Box sx={{ mt: 1.5 }}>
                <Button
                  size="small" color="error" variant="text"
                  startIcon={<DeleteIcon fontSize="small" />}
                  onClick={handleRemoveAvatar}
                  disabled={avatarUploading}
                  sx={{ fontSize: '0.72rem' }}
                >
                  Remove photo
                </Button>
              </Box>
            )}

            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1, fontSize: '0.65rem' }}>
              JPG, PNG, WEBP or GIF · max 2 MB
            </Typography>

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
          {/* ── Edit profile ────────────────────────────────────────────── */}
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
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveProfile} disabled={saving || !name || !email}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </Paper>

          {/* ── Change password ──────────────────────────────────────────── */}
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
                disabled={pwdSaving || !curPwd || !newPwd || !confPwd}
              >
                {pwdSaving ? 'Updating…' : 'Update Password'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

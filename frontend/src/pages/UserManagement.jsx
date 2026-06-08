import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Switch, FormControlLabel, Avatar,
} from '@mui/material';
import AddIcon       from '@mui/icons-material/Add';
import EditIcon      from '@mui/icons-material/Edit';
import DeleteIcon    from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import api           from '../api/axiosConfig';
import { useAuth }   from '../context/AuthContext';
import { useToast }  from '../context/ToastContext';
import SectionHeader from '../components/common/SectionHeader';

// ── Role config ───────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    color: 'error',
    desc:  'Full access — users, audit log, data, models, all reports',
  },
  {
    value: 'executive_manager',
    label: 'Executive Manager',
    color: 'secondary',
    desc:  'Full read access — dashboard, predictions, ranking, analytics, report. No upload or audit.',
  },
  {
    value: 'manager',
    label: 'Manager',
    color: 'primary',
    desc:  'Like Executive Manager + can upload data and train models.',
  },
  {
    value: 'officer',
    label: 'Officer',
    color: 'info',
    desc:  'Same as Manager — upload data, train models, run predictions.',
  },
];

const ROLE_MAP   = Object.fromEntries(ROLES.map(r => [r.value, r]));

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'officer' };

export default function UserManagement() {
  const { user: me } = useAuth();
  const toast = useToast();

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialog,   setDialog]   = useState(null);   // null | 'create' | 'edit'
  const [editUser, setEditUser] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  const [resetDialog, setResetDialog] = useState(null);
  const [newPwd,      setNewPwd]      = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Create ────────────────────────────────────────────────────────────────
  const openCreate = () => { setForm(EMPTY_FORM); setDialog('create'); };
  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(`User "${form.full_name}" created.`);
      setDialog(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, role: u.role, is_active: u.is_active });
    setDialog('edit');
  };
  const handleEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, {
        full_name: form.full_name,
        email:     form.email,
        role:      form.role,
        is_active: form.is_active,
      });
      toast.success('User updated.');
      setDialog(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success(`User "${u.full_name}" deleted.`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ── Reset password ────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPwd.trim() || newPwd.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    try {
      await api.put(`/users/${resetDialog.id}/reset-password`, { new_password: newPwd });
      toast.success(`Password reset for ${resetDialog.email}.`);
      setResetDialog(null);
      setNewPwd('');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Box>
      <SectionHeader
        title="User Management"
        subtitle="Create and manage platform users and their roles"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add User
          </Button>
        }
      />

      {/* Role legend */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {ROLES.map(({ value, label, color, desc }) => (
          <Box key={value} sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1,
            p: 1.5, borderRadius: 2, flex: '1 1 220px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}>
            <Chip label={label} color={color} size="small" sx={{ fontWeight: 700, flexShrink: 0, mt: 0.25 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{desc}</Typography>
          </Box>
        ))}
      </Box>

      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(u => {
                  const roleCfg = ROLE_MAP[u.role] || { label: u.role, color: 'default' };
                  return (
                    <TableRow key={u.id} hover sx={{ opacity: u.is_active ? 1 : 0.5 }}>
                      {/* User */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={u.avatar_url ? `http://localhost:8000${u.avatar_url}` : undefined}
                            sx={{
                              width: 34, height: 34, fontSize: '0.75rem', fontWeight: 700,
                              bgcolor: u.id === me?.id ? 'primary.dark' : 'rgba(99,102,241,0.2)',
                              color: 'primary.light',
                            }}
                          >
                            {!u.avatar_url && initials(u.full_name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {u.full_name}
                              {u.id === me?.id && (
                                <Chip label="You" size="small" sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{u.email}</Typography>
                      </TableCell>

                      {/* Role badge */}
                      <TableCell>
                        <Chip
                          label={roleCfg.label}
                          color={roleCfg.color}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      </TableCell>

                      {/* Permission summary */}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip label="View" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', borderColor: '#10b981', color: '#10b981' }} />
                          {['admin','manager','officer'].includes(u.role) && (
                            <Chip label="Upload" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', borderColor: '#6366f1', color: '#6366f1' }} />
                          )}
                          {['admin','manager','officer'].includes(u.role) && (
                            <Chip label="Train" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', borderColor: '#06b6d4', color: '#06b6d4' }} />
                          )}
                          {u.role === 'admin' && (
                            <Chip label="Admin" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', borderColor: '#ef4444', color: '#ef4444' }} />
                          )}
                        </Box>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          label={u.is_active ? 'Active' : 'Disabled'}
                          color={u.is_active ? 'success' : 'default'}
                          size="small" variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>

                      {/* Last login */}
                      <TableCell>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Tooltip title="Edit user">
                          <IconButton size="small" onClick={() => openEdit(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset password">
                          <IconButton size="small" onClick={() => { setResetDialog(u); setNewPwd(''); }}>
                            <LockResetIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.id === me?.id ? "Can't delete yourself" : 'Delete user'}>
                          <span>
                            <IconButton
                              size="small" color="error"
                              disabled={u.id === me?.id}
                              onClick={() => handleDelete(u)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Create / Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle>{dialog === 'create' ? 'Add New User' : 'Edit User'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth label="Full Name" value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            size="small" sx={{ mb: 2 }} required
          />
          <TextField
            fullWidth label="Email Address" type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            size="small" sx={{ mb: 2 }} required
          />
          {dialog === 'create' && (
            <TextField
              fullWidth label="Password" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              size="small" sx={{ mb: 2 }} required
              helperText="Minimum 8 characters"
            />
          )}
          <FormControl fullWidth size="small" sx={{ mb: dialog === 'edit' ? 2 : 0 }}>
            <InputLabel>Role</InputLabel>
            <Select value={form.role} label="Role"
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Chip label={r.label} color={r.color} size="small" sx={{ fontWeight: 700, minWidth: 130 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{r.desc}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {dialog === 'edit' && (
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label="Account Active"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={dialog === 'create' ? handleCreate : handleEdit}
            disabled={saving || !form.full_name || !form.email || (dialog === 'create' && !form.password)}
            startIcon={saving && <CircularProgress size={14} color="inherit" />}
          >
            {saving ? 'Saving…' : dialog === 'create' ? 'Create User' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reset Password Dialog ──────────────────────────────────────────── */}
      <Dialog open={Boolean(resetDialog)} onClose={() => setResetDialog(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Set a new password for <strong>{resetDialog?.full_name}</strong>
          </Typography>
          <TextField
            fullWidth label="New Password" type="password"
            value={newPwd} onChange={e => setNewPwd(e.target.value)}
            size="small" autoFocus helperText="Minimum 8 characters"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={!newPwd.trim()}>
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

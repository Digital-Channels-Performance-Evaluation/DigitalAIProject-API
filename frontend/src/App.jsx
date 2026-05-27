import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { AppThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataManagement from './pages/DataManagement';
import ModelTraining from './pages/ModelTraining';
import Predictions from './pages/Predictions';
import UserManagement from './pages/UserManagement';
import ChannelRanking from './pages/ChannelRanking';
import Analytics from './pages/Analytics';
import AuditLog from './pages/AuditLog';
import Profile from './pages/Profile';
import SmartReport from './pages/SmartReport';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="data"        element={<DataManagement />} />
        <Route path="models"      element={<ModelTraining />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="ranking"     element={<ChannelRanking />} />
        <Route path="analytics"   element={<Analytics />} />
        <Route path="report"      element={<SmartReport />} />
        <Route path="audit"       element={<ProtectedRoute adminOnly><AuditLog /></ProtectedRoute>} />
        <Route path="profile"     element={<Profile />} />
        <Route path="users"       element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

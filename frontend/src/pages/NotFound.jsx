import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ShowChartIcon from '@mui/icons-material/ShowChart';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: 'background.default',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', p: 3,
    }}>
      <Box sx={{
        width: 64, height: 64, borderRadius: 3, mb: 3,
        background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
      }}>
        <ShowChartIcon sx={{ color: '#fff', fontSize: 32 }} />
      </Box>
      <Typography variant="h1" sx={{ fontWeight: 800, fontSize: '5rem', color: 'primary.light', lineHeight: 1 }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ mt: 1, mb: 1, color: 'text.primary' }}>
        Page not found
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, textAlign: 'center', maxWidth: 360 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </Box>
  );
}

import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = '#A80000',
  trend,
  loading = false,
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}, transparent)`,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {title}
          </Typography>

          {loading ? (
            <Skeleton variant="text" width={80} height={40} sx={{ mt: 0.5 }} />
          ) : (
            <Typography variant="h4" sx={{ mt: 0.5, color: 'text.primary', fontWeight: 700 }}>
              {value ?? '—'}
            </Typography>
          )}

          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}

          {trend !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              {trend >= 0 ? (
                <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
              ) : (
                <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
              )}
              <Typography variant="caption" sx={{ color: trend >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>

        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

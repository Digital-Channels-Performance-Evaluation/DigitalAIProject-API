import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext(null);

function buildTheme(mode) {
  const dark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: {
        main:  '#6366f1',
        light: '#818cf8',
        dark:  '#4f46e5',
      },
      secondary: {
        main:  '#06b6d4',
        light: '#22d3ee',
        dark:  '#0891b2',
      },
      success: { main: '#10b981', light: '#34d399' },
      warning: { main: '#f59e0b', light: '#fbbf24' },
      error:   { main: '#ef4444', light: '#f87171' },
      background: {
        default: dark ? '#0f1117' : '#f1f5f9',
        paper:   dark ? '#1a1d27' : '#ffffff',
      },
      divider: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)',
      text: {
        primary:   dark ? '#e2e8f0' : '#0f172a',
        secondary: dark ? '#94a3b8' : '#475569',
      },
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      body2: { color: dark ? '#94a3b8' : '#475569' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: dark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(0,0,0,0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
          containedPrimary: {
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
              boxShadow: '0 6px 20px rgba(99,102,241,0.5)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500 } },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            color: dark ? '#94a3b8' : '#475569',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: dark
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(0,0,0,0.10)',
            backgroundColor: dark ? '#1a1d27' : '#f8fafc',
          },
          body: {
            borderBottom: dark
              ? '1px solid rgba(255,255,255,0.04)'
              : '1px solid rgba(0,0,0,0.06)',
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 4 } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? '#1a1d27' : '#ffffff',
            color: dark ? '#e2e8f0' : '#0f172a',
            borderBottom: dark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(0,0,0,0.08)',
            boxShadow: 'none',
          },
        },
      },
      // ── Inputs — fully visible in both modes ──────────────────────────
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              color: dark ? '#e2e8f0' : '#0f172a',
              '& fieldset': {
                borderColor: dark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.23)',
              },
              '&:hover fieldset': {
                borderColor: dark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#6366f1',
              },
            },
            '& .MuiInputLabel-root': {
              color: dark ? '#94a3b8' : '#475569',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#6366f1',
            },
            '& .MuiInputBase-input': {
              color: dark ? '#e2e8f0' : '#0f172a',
            },
            '& .MuiFormHelperText-root': {
              color: dark ? '#94a3b8' : '#475569',
            },
            '& .MuiFormHelperText-root.Mui-error': {
              color: '#ef4444',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: { color: dark ? '#e2e8f0' : '#0f172a' },
          icon:  { color: dark ? '#94a3b8' : '#475569' },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: dark ? '#e2e8f0' : '#0f172a',
            '&:hover': {
              backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
            '&.Mui-selected': {
              backgroundColor: dark ? 'rgba(99,102,241,0.20)' : 'rgba(99,102,241,0.10)',
              '&:hover': {
                backgroundColor: dark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.16)',
              },
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: dark ? '#94a3b8' : '#475569',
            '&.Mui-focused': { color: '#6366f1' },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: dark ? '#94a3b8' : '#475569',
            '&:hover': {
              backgroundColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
              color: dark ? '#e2e8f0' : '#0f172a',
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          standardError:   { color: dark ? '#fca5a5' : '#991b1b' },
          standardSuccess: { color: dark ? '#86efac' : '#166534' },
          standardWarning: { color: dark ? '#fde68a' : '#92400e' },
          standardInfo:    { color: dark ? '#93c5fd' : '#1e40af' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: dark ? '#1a1d27' : '#ffffff',
            color: dark ? '#e2e8f0' : '#0f172a',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? '#0f1117' : '#1e293b',
            color: '#ffffff',
            fontSize: '0.75rem',
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            color: dark ? '#94a3b8' : '#475569',
            borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)',
            '&.Mui-selected': {
              color: dark ? '#e2e8f0' : '#0f172a',
              backgroundColor: dark ? 'rgba(99,102,241,0.20)' : 'rgba(99,102,241,0.12)',
            },
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          label: { color: dark ? '#e2e8f0' : '#0f172a' },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          track: {
            backgroundColor: dark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.25)',
          },
        },
      },
    },
  });
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => { localStorage.setItem('theme', mode); }, [mode]);

  const toggleTheme = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside AppThemeProvider');
  return ctx;
}

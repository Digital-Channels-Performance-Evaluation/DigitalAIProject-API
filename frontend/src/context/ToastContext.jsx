import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

const ToastContext = createContext(null);

function SlideUp(props) {
  return <Slide {...props} direction="up" />;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, severity = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, severity, duration, open: true }]);
  }, []);

  const close = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, open: false } : t));
    // Remove after animation
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
  }, []);

  const toast = {
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'error',   dur),
    info:    (msg, dur) => show(msg, 'info',     dur),
    warning: (msg, dur) => show(msg, 'warning',  dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.map((t, i) => (
        <Snackbar
          key={t.id}
          open={t.open}
          autoHideDuration={t.duration}
          onClose={() => close(t.id)}
          TransitionComponent={SlideUp}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: `${24 + i * 64}px !important` }}
        >
          <Alert
            onClose={() => close(t.id)}
            severity={t.severity}
            variant="filled"
            sx={{ minWidth: 280, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
          >
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

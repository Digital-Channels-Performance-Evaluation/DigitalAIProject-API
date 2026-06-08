import React, { createContext, useContext, useState, useCallback } from 'react';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState({
    lowChannels:       [],
    decliningChannels: [],
    unseen:            false, // true = badge shows count; false = bell shows but no count
  });

  // Called by Dashboard every 30s when ranking data loads
  const updateAlerts = useCallback((ranking) => {
    const low       = ranking.filter(ch => ch.performance_tier === 'Low');
    const declining = ranking.filter(ch => ch.trend === -1 && ch.performance_tier !== 'High');
    const newTotal  = low.length + declining.length;

    setAlerts(prev => {
      const prevTotal = prev.lowChannels.length + prev.decliningChannels.length;
      // Mark unseen only when new alerts appear (count increased)
      const unseen = newTotal > prevTotal ? true : prev.unseen;
      return { lowChannels: low, decliningChannels: declining, unseen };
    });
  }, []);

  // Called when user opens the notification popover
  const markSeen = useCallback(() => {
    setAlerts(prev => ({ ...prev, unseen: false }));
  }, []);

  const totalCount = alerts.lowChannels.length + alerts.decliningChannels.length;

  return (
    <AlertContext.Provider value={{ alerts, updateAlerts, markSeen, totalCount }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used inside AlertProvider');
  return ctx;
}

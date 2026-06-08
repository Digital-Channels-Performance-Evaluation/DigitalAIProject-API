/**
 * Global refresh bus — dual mechanism:
 * 1. window.CustomEvent  (instant, same tab)
 * 2. localStorage timestamp (catches missed events during hydration)
 *
 * Usage:
 *   emit:    refreshBus.emit()
 *   listen:  refreshBus.on(fn)  /  refreshBus.off(fn)
 */

const EVENT_KEY   = "ahadu-data-updated";
const STORAGE_KEY = "ahadu_last_refresh";

export const refreshBus = {
  emit() {
    if (typeof window === "undefined") return;
    // Write timestamp so any page that checks localStorage knows to refresh
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    // Dispatch event for same-page listeners
    window.dispatchEvent(new CustomEvent(EVENT_KEY));
  },

  on(fn: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(EVENT_KEY, fn);
    return () => window.removeEventListener(EVENT_KEY, fn);
  },

  off(fn: () => void) {
    if (typeof window === "undefined") return;
    window.removeEventListener(EVENT_KEY, fn);
  },

  /** Returns the last refresh timestamp (ms). */
  lastRefresh(): number {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  },
};

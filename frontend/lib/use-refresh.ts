/**
 * useRefresh — subscribes a component's reload function to the global refreshBus.
 *
 * Works across all Next.js pages because it uses both:
 * - CustomEvent (same-tab immediate sync)
 * - localStorage `storage` event (cross-tab and post-navigation sync)
 *
 * Usage:
 *   const load = useCallback(async () => { ... fetch data ... }, []);
 *   useRefresh(load);
 *
 * The `load` function MUST be wrapped in useCallback with stable deps
 * to prevent the listener from re-registering on every render.
 */
import { useEffect, useRef } from "react";
import { refreshBus } from "./refresh-bus";

export function useRefresh(reloadFn: () => void) {
  // Keep a ref so the stable cleanup always calls the latest version
  const fnRef = useRef(reloadFn);
  useEffect(() => { fnRef.current = reloadFn; }, [reloadFn]);

  useEffect(() => {
    const handler = () => fnRef.current();

    // Subscribe to in-tab custom event — returns cleanup fn
    const cleanup = refreshBus.on(handler);

    // Also subscribe to storage events for cross-tab / post-navigation sync
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "ahadu_last_refresh") {
        fnRef.current();
      }
    };
    window.addEventListener("storage", storageHandler);

    return () => {
      if (typeof cleanup === "function") cleanup();
      window.removeEventListener("storage", storageHandler);
    };
  }, []); // empty deps — register once
}

/**
 * useRefresh — subscribes a component's reload function to the global refreshBus.
 *
 * Uses only the CustomEvent mechanism (same-tab). The storage event is intentionally
 * omitted here — it fires cross-tab only in browsers, so there's no double-fire risk,
 * but adding it caused duplicate loads in the same tab via manual listeners elsewhere.
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

/**
 * useRefresh — fires `reloadFn(true)` when data is uploaded.
 * Always passes `true` (silent=true) so pages refresh in background
 * without showing the full loading skeleton.
 */
export function useRefresh(reloadFn: (silent?: boolean) => void) {
  const fnRef = useRef(reloadFn);
  useEffect(() => { fnRef.current = reloadFn; }, [reloadFn]);

  useEffect(() => {
    // Pass true so callers that accept a `silent` param skip the loading spinner
    const handler = () => fnRef.current(true);
    const cleanup = refreshBus.on(handler);
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);
}

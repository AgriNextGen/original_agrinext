import { useState, useEffect } from 'react';

/**
 * Returns true if `isLoading` has been true for longer than `timeoutMs`.
 * Resets when `isLoading` flips to false.
 *
 * Use to replace stuck skeleton loaders with a proper empty state
 * when the backend never resolves.
 */
export function useLoadingTimeout(isLoading: boolean, timeoutMs = 5000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return timedOut;
}

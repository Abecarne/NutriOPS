import { useEffect, useRef } from 'react';

/**
 * Debounced effect — runs `effect` `delay`ms after `deps` settle.
 * Returns a cleanup-safe handle; the callback is not fired on unmount.
 */
export function useDebouncedEffect(
  effect: () => void,
  deps: unknown[],
  delay = 500,
) {
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(effect, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}

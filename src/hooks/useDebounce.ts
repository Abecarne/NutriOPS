import { useEffect, useRef } from 'react';

/**
 * Runs `effect` `delay`ms after the last change to `deps`. The effect
 * is *not* fired on initial mount — only on dep changes after that.
 *
 * Caller contract for save flows:
 * 1. Track a `dirty` ref next to your local state. Set it to `true`
 *    whenever the user actually edits something. Reset it to `false`
 *    after each successful save.
 * 2. Inside the effect, early-return if `!dirty.current` — that way
 *    rerenders triggered by external state (parent setState, server
 *    echoes via props) cannot generate a redundant save.
 *
 * StrictMode note: the effect skips the first run via a per-instance
 * ref, so the dev-only double-mount does NOT trigger a phantom save.
 *
 * @example
 *   const dirty = useRef(false);
 *   const [value, setValue] = useState(initial);
 *   useDebouncedEffect(
 *     () => { if (!dirty.current) return; save(value).then(() => { dirty.current = false; }); },
 *     [value],
 *   );
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

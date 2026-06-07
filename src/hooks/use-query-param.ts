import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './use-debounced-value';

interface Options {
  /** Debounce ms before the URL updates (and `debouncedValue` changes). 0 = immediate. */
  debounceMs?: number;
  /** Replace history instead of pushing (default true — no Back-button spam). */
  replace?: boolean;
}

interface QueryParam {
  /** Live value — reflects typing instantly; bind this to the input. */
  value: string;
  /** Debounced value — use this to drive filtering / fetching / query keys. */
  debouncedValue: string;
  /** Update the value (and, after the debounce, the URL). */
  setValue: (next: string) => void;
}

/**
 * Two-way bind a single URL search param (e.g. `?q=`). The URL is the source of
 * truth, so the view is shareable / bookmarkable and the Back button works.
 *
 * Typing updates `value` immediately (responsive input) but only writes the URL
 * after `debounceMs` of no changes — avoiding a history entry / refetch per
 * keystroke. Read `debouncedValue` for anything expensive (server query, filter):
 *
 *   const { value, debouncedValue, setValue } = useQueryParam('q');
 *   <Input value={value} onChange={(e) => setValue(e.target.value)} />
 *   const { data } = useThings(debouncedValue);   // fires on pause, not per key
 *
 * The input is seeded from the URL once at mount. If you need it to re-sync to
 * an EXTERNAL url change while mounted (e.g. a link that rewrites `?q=` without
 * remounting), remount the consumer with a `key` that includes the param.
 */
export function useQueryParam(key: string, options: Options = {}): QueryParam {
  const { debounceMs = 300, replace = true } = options;
  const [params, setParams] = useSearchParams();

  // Seed once from the URL; thereafter local state is authoritative for typing.
  const [value, setValue] = useState(() => params.get(key) ?? '');
  const debouncedValue = useDebouncedValue(value, debounceMs);

  // Mirror the debounced value into the URL. setParams is router navigation, not
  // component state, so this effect doesn't trigger a setState cascade.
  useEffect(() => {
    setParams(
      (prev) => {
        if (prev.get(key) === (debouncedValue || null)) return prev;
        if (debouncedValue) prev.set(key, debouncedValue);
        else prev.delete(key);
        return prev;
      },
      { replace },
    );
  }, [debouncedValue, key, replace, setParams]);

  const update = useCallback((next: string) => setValue(next), []);

  return { value, debouncedValue, setValue: update };
}

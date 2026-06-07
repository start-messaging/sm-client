import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * True when the viewport is below the mobile breakpoint. Used by shadcn's
 * Sidebar to switch between the desktop rail and the mobile sheet.
 *
 * Implemented with useSyncExternalStore so the value is read synchronously (no
 * `undefined` flash, no setState-in-effect) and stays subscribed to viewport
 * changes. (Rewritten from the stock CLI hook to satisfy react-hooks@7.)
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false, // server snapshot (no SSR here, but required by the API)
  );
}

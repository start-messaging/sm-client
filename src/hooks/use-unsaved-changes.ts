import { useEffect } from 'react';
import { useBlocker, type Blocker } from 'react-router-dom';

/**
 * Chrome-style leave warning: `beforeunload` on refresh/close, and a React
 * Router blocker when the in-app back link would discard edits.
 */
export function useUnsavedChanges(isDirty: boolean): Blocker {
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  return blocker;
}

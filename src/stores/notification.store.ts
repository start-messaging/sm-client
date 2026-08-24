import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageKey } from '@/config/app';

interface NotificationState {
  /** Module (nav segment, e.g. 'inbox') → has an update the user hasn't seen. */
  hasUpdate: Record<string, boolean>;
  setHasUpdate: (module: string, value: boolean) => void;
  clearHasUpdate: (module: string) => void;
}

/**
 * Cross-tab-persisted "unviewed update" flags per nav module, used to render a
 * small pulsing dot on the sidebar. SSE handlers (see use-inbox-realtime) set
 * the flag; the corresponding page clears it on mount.
 */
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      hasUpdate: {},
      setHasUpdate: (module, value) =>
        set((s) => ({ hasUpdate: { ...s.hasUpdate, [module]: value } })),
      clearHasUpdate: (module) =>
        set((s) => ({ hasUpdate: { ...s.hasUpdate, [module]: false } })),
    }),
    { name: storageKey('notifications') },
  ),
);

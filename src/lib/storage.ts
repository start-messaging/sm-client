import { storageKey } from '@/config/app';

/**
 * Typed browser-storage manager. Three backends:
 *
 *   storage.local   — localStorage with OPTIONAL TTL. A value can be set to
 *                     expire after N ms; reading it past expiry removes it and
 *                     returns null (lazy expiry — no timers). JSON-encoded.
 *   storage.session — sessionStorage, same TTL envelope. Survives reloads but
 *                     not the tab — the right default for in-flight flow state
 *                     (e.g. a signup wizard) that shouldn't outlive the visit.
 *   storage.cookie  — document.cookie get/set/remove with sane defaults.
 *
 * Every key is namespaced via `storageKey()` (APP_ID-derived), so the two apps
 * never collide. All access is wrapped in try/catch: storage can throw (Safari
 * private mode, quota, disabled cookies), and a telemetry helper must never
 * break the app — failures degrade to null / no-op.
 */

/* ------------------------- localStorage / sessionStorage ------------------------- */

interface StoredEnvelope<T> {
  /** The payload. */
  v: T;
  /** Absolute epoch-ms expiry, or null for "never". */
  e: number | null;
}

function now(): number {
  return Date.now();
}

/** Both web-storage backends share the TTL envelope; only the store differs. */
function makeWebStorage(getStore: () => Storage) {
  return {
    /**
     * Persist a value. `ttlMs` (optional) makes it expire that many ms from
     * now; omit for a permanent entry.
     */
    set<T>(key: string, value: T, ttlMs?: number): void {
      try {
        const envelope: StoredEnvelope<T> = {
          v: value,
          e: ttlMs != null ? now() + ttlMs : null,
        };
        getStore().setItem(storageKey(key), JSON.stringify(envelope));
      } catch {
        // Quota exceeded / disabled storage — non-fatal.
      }
    },

    /** Read a value, or null if missing, malformed, or expired (removes if expired). */
    get<T>(key: string): T | null {
      try {
        const raw = getStore().getItem(storageKey(key));
        if (raw == null) return null;
        const envelope = JSON.parse(raw) as StoredEnvelope<T>;
        if (envelope.e != null && now() > envelope.e) {
          getStore().removeItem(storageKey(key));
          return null;
        }
        return envelope.v;
      } catch {
        return null;
      }
    },

    remove(key: string): void {
      try {
        getStore().removeItem(storageKey(key));
      } catch {
        // ignore
      }
    },
  } as const;
}

export const local = makeWebStorage(() => window.localStorage);
export const session = makeWebStorage(() => window.sessionStorage);

/* --------------------------------- cookies --------------------------------- */

interface CookieOptions {
  /** Lifetime in seconds. Omit for a session cookie. */
  maxAgeSec?: number;
  path?: string; // default '/'
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

export const cookie = {
  set(name: string, value: string, opts: CookieOptions = {}): void {
    try {
      const { maxAgeSec, path = '/', sameSite = 'Lax', secure } = opts;
      let str = `${encodeURIComponent(storageKey(name))}=${encodeURIComponent(value)}; path=${path}; samesite=${sameSite}`;
      if (maxAgeSec != null) str += `; max-age=${maxAgeSec}`;
      if (secure || sameSite === 'None') str += '; secure';
      document.cookie = str;
    } catch {
      // ignore
    }
  },

  get(name: string): string | null {
    try {
      const target = encodeURIComponent(storageKey(name));
      const hit = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${target}=`));
      return hit ? decodeURIComponent(hit.slice(target.length + 1)) : null;
    } catch {
      return null;
    }
  },

  remove(name: string, path = '/'): void {
    try {
      document.cookie = `${encodeURIComponent(storageKey(name))}=; path=${path}; max-age=0`;
    } catch {
      // ignore
    }
  },
} as const;

export const storage = { local, session, cookie } as const;

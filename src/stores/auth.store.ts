import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageKey } from '@/config/app';
import { clearWizardStores } from '@/lib/wizard-storage';
import type { AuthResult, UserView, WorkspaceRole } from '@/types/api';

/**
 * Client-side session state — the small slice of *client* state that does NOT
 * belong in TanStack Query (server cache). Holds the auth tokens, the current
 * user, and the active workspace + role.
 *
 * Storage strategy (the backend returns the refresh token in the response body):
 *   - access token: memory only (not persisted) — short-lived, re-minted from
 *     the refresh token on reload.
 *   - refresh token + user + active workspace: persisted so a reload restores
 *     the session.
 * When the backend moves the refresh token to an httpOnly cookie, drop it from
 * `partialize` and stop sending it in the refresh body.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserView | null;
  activeWorkspaceId: string | null;
  /** Persisted so `/` can return the user to their last workspace. */
  activeWorkspaceSlug: string | null;
  activeWorkspaceRole: WorkspaceRole | null;

  /** True once we have a refresh token — i.e. there is a session to restore. */
  isAuthenticated: () => boolean;

  /** Set the whole session from a login / verify-otp result. */
  setSession: (result: AuthResult) => void;
  /** Replace just the access token (after a workspace switch). */
  setAccessToken: (token: string) => void;
  /** Replace both tokens (after a rotating refresh). */
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  /** Refresh the user profile (from /me or a mobile-verification step). */
  setUser: (user: UserView) => void;
  /** Remember the workspace the user is currently inside (set by the shell). */
  setActiveContext: (ctx: {
    id: string;
    slug: string;
    role: WorkspaceRole;
  }) => void;
  /** Forget the remembered workspace (it 404'd: deleted / membership revoked). */
  clearActiveContext: () => void;
  /** Clear everything (logout / hard auth failure). */
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeWorkspaceId: null,
      activeWorkspaceSlug: null,
      activeWorkspaceRole: null,

      isAuthenticated: () => !!get().refreshToken,

      setSession: (r) =>
        set({
          accessToken: r.accessToken,
          refreshToken: r.refreshToken,
          user: r.user,
          // A fresh sign-in starts neutral; entering a workspace sets context.
          activeWorkspaceId: null,
          activeWorkspaceSlug: null,
          activeWorkspaceRole: null,
        }),

      setAccessToken: (token) => set({ accessToken: token }),

      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      setActiveContext: (ctx) =>
        set({
          activeWorkspaceId: ctx.id,
          activeWorkspaceSlug: ctx.slug,
          activeWorkspaceRole: ctx.role,
        }),

      clearActiveContext: () =>
        set({
          activeWorkspaceId: null,
          activeWorkspaceSlug: null,
          activeWorkspaceRole: null,
        }),

      clear: () => {
        // In-flight wizard state dies with the session — the next person on
        // this tab must never resume (or resend to) a previous user's
        // destination.
        clearWizardStores();
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          activeWorkspaceId: null,
          activeWorkspaceSlug: null,
          activeWorkspaceRole: null,
        });
      },
    }),
    {
      name: storageKey('auth'),
      // Do NOT persist the access token (memory-only, re-minted on reload).
      partialize: (s) => ({
        refreshToken: s.refreshToken,
        user: s.user,
        activeWorkspaceId: s.activeWorkspaceId,
        activeWorkspaceSlug: s.activeWorkspaceSlug,
        activeWorkspaceRole: s.activeWorkspaceRole,
      }),
    },
  ),
);

/** Non-React accessor for the http layer (interceptors run outside components). */
export const authStore = {
  get: () => useAuthStore.getState(),
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthResult, UserView } from '@/types/api';

/**
 * GET /auth/me — the source of truth for "who am I". Enabled only when
 * authenticated. The app layout syncs the profile back into the store so a
 * reload keeps `mobileVerified` (and the onboarding gate) fresh.
 */
export function useMe() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authApi.me,
    enabled: isAuthed,
    staleTime: STALE.STANDARD,
  });
}

/**
 * Refresh identity-scoped data after a fresh sign-in, WITHOUT dropping
 * user-independent reference data (e.g. the countries picker list).
 * Workspaces are REMOVED (not just invalidated): a different account may sign
 * in on this tab, and an invalidated query still serves the previous user's
 * cached list while refetching — the redirect/launcher would briefly act on it.
 */
function invalidateUserScoped(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
  void qc.invalidateQueries({ queryKey: queryKeys.services.all() });
  qc.removeQueries({ queryKey: queryKeys.workspaces.all() });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result: AuthResult) => {
      setSession(result);
      invalidateUserScoped(qc);
    },
  });
}

export function useSignup() {
  // Signup creates identity only; no session yet → returns { verificationToken }.
  return useMutation({ mutationFn: authApi.signup });
}

/**
 * Resend the signup email code (token-keyed, no password). Bare mutation —
 * callers own the wizard-storage update and countdown side effects.
 */
export function useResendOtp() {
  return useMutation({ mutationFn: authApi.resendOtp });
}

export function useVerifyOtp() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (result: AuthResult) => {
      setSession(result);
      invalidateUserScoped(qc);
    },
  });
}

/** Step 3: stage the mobile number → SMS OTP sent. Returns the token. */
export function useSetMobile() {
  return useMutation({ mutationFn: authApi.setMobile });
}

/** Step 4: verify the SMS code. Updates the stored user (unlocks the app). */
export function useVerifyMobileOtp() {
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.verifyMobileOtp,
    onSuccess: (user: UserView) => {
      setUser(user);
      invalidateUserScoped(qc);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    // Clear locally regardless of the server result (token may already be dead).
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Services available in the user's country (the no-workspace home grid).
 * Enabled only once onboarding fixed the country — the endpoint 403s before
 * that, and the RequireOnboarded guard keeps un-onboarded users away anyway.
 */
export function useAvailableServices() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.services.byCountry(user?.countryCode ?? 'unknown'),
    queryFn: servicesApi.listAvailable,
    enabled: !!user?.countryCode && user.mobileVerified,
    staleTime: STALE.STATIC,
  });
}

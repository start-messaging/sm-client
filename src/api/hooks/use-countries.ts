import { useQuery } from '@tanstack/react-query';
import { countriesApi } from '@/api/countries.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

/** Active countries for the onboarding phone picker. Reference data. */
export function useCountryOptions() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.countries.options(),
    queryFn: countriesApi.list,
    enabled: isAuthed,
    staleTime: STALE.STATIC,
  });
}

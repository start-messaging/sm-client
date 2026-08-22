import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  inboxSettingsApi,
  type InboxSettings,
  type PatchInboxSettingsBody,
} from '@/api/inbox-settings.api';
import { STALE } from '@/lib/query-client';

const qk = {
  settings: (slug: string) => ['inbox-settings', slug] as const,
};

export function useInboxSettings(slug: string) {
  return useQuery<InboxSettings>({
    queryKey: qk.settings(slug),
    queryFn: () => inboxSettingsApi.get(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

export function usePatchInboxSettings(slug: string) {
  const qc = useQueryClient();
  return useMutation<InboxSettings, unknown, PatchInboxSettingsBody>({
    mutationFn: (body) => inboxSettingsApi.patch(slug, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.settings(slug), data);
    },
  });
}

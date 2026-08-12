import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappApi, type ConnectWhatsAppBody } from '@/api/whatsapp.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

/** WABA connection status for the current workspace. */
export function useWabaStatus(slug: string) {
  return useQuery({
    queryKey: queryKeys.whatsapp.status(slug),
    queryFn: () => whatsappApi.getStatus(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

/** Complete the Embedded Signup flow by exchanging the FB SDK code. */
export function useConnectWhatsApp(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConnectWhatsAppBody) => whatsappApi.connect(slug, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.whatsapp.status(slug) });
    },
  });
}

/** Register a PENDING phone with Cloud API (6-digit PIN). */
export function useRegisterPhone(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pin: string) => whatsappApi.registerPhone(slug, pin),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.whatsapp.status(slug) });
    },
  });
}

/** Disconnect the WABA from this workspace. */
export function useDisconnectWhatsApp(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappApi.disconnect(slug),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.whatsapp.status(slug) });
    },
  });
}

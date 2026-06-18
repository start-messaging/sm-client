import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { workspacesApi } from '@/api/workspaces.api';
import { STALE } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { CreateWorkspaceBody } from '@/types/api';

/** All my workspaces — drives the launcher, the gallery CTAs and `/` redirect. */
export function useMyWorkspaces() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.workspaces.mine(),
    queryFn: workspacesApi.listMine,
    enabled: isAuthed,
    staleTime: STALE.STANDARD,
  });
}

/** One workspace by URL slug — the workspace shell's context query. */
export function useWorkspace(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaces.bySlug(slug ?? ''),
    queryFn: () => workspacesApi.getBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE.STANDARD,
  });
}

/** The workspace's read-only wallet balance (the dashboard panel). */
export function useWorkspaceWallet(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaces.wallet(slug ?? ''),
    queryFn: () => workspacesApi.walletBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE.STANDARD,
  });
}

/** Create a workspace under a service; refreshes every workspace-scoped list. */
export function useCreateWorkspace(serviceKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkspaceBody) =>
      workspacesApi.create(serviceKey, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
    },
  });
}

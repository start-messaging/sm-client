import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspacesApi } from '@/api/workspaces.api';
import { servicesApi } from '@/api/services.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

export function useWorkspaces() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.workspaces.all(),
    queryFn: workspacesApi.list,
    enabled: isAuthed,
    staleTime: STALE.STANDARD,
  });
}

export function useCurrentWorkspace() {
  const activeWorkspaceId = useAuthStore((s) => s.activeWorkspaceId);
  return useQuery({
    // Scope by workspace so each workspace's "current" detail caches independently.
    // ('none' is unreachable — the query is disabled when null.)
    queryKey: queryKeys.workspaces.current(activeWorkspaceId ?? 'none'),
    queryFn: workspacesApi.current,
    enabled: !!activeWorkspaceId,
    staleTime: STALE.STANDARD,
  });
}

/** Public services catalogue — reference data, cached aggressively. */
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.all(),
    queryFn: servicesApi.listActive,
    staleTime: STALE.STATIC,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.create,
    onSuccess: () => {
      // Both the workspace list AND /auth/me embed the user's workspaces.
      void qc.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

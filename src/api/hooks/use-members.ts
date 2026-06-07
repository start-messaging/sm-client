import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { WorkspaceRole } from '@/types/api';

/**
 * Team members of the active workspace. The key is namespaced by workspaceId so
 * it's automatically isolated per workspace (and dropped on workspace switch).
 */
export function useMembers() {
  const workspaceId = useAuthStore((s) => s.activeWorkspaceId);
  return useQuery({
    queryKey: queryKeys.members.all(workspaceId ?? 'none'),
    queryFn: membersApi.list,
    enabled: !!workspaceId,
    staleTime: STALE.STANDARD,
  });
}

function useInvalidateMembers() {
  const qc = useQueryClient();
  // Read the active workspace at invalidation time (getState()), NOT at hook
  // creation — otherwise a workspace switch between firing a member mutation and
  // its completion would invalidate the wrong workspace's cache.
  return () => {
    const workspaceId = useAuthStore.getState().activeWorkspaceId;
    return qc.invalidateQueries({
      queryKey: queryKeys.members.all(workspaceId ?? 'none'),
    });
  };
}

export function useInviteMember() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: membersApi.invite,
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateMemberRole() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: (input: { memberId: string; role: WorkspaceRole }) =>
      membersApi.updateRole(input.memberId, input.role),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: (memberId: string) => membersApi.remove(memberId),
    onSuccess: () => void invalidate(),
  });
}

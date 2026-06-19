import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';
import type {
  ClaimInviteBody,
  InviteMemberBody,
  UpdateMemberRoleBody,
} from '@/types/api';

/** The workspace roster (active members + pending invitations). */
export function useMembers(slug: string, workspaceId: string) {
  return useQuery({
    // Keyed by workspaceId (what mutations invalidate) + slug (what the fetch
    // uses); invalidating the `members.all(workspaceId)` prefix still matches.
    queryKey: [...queryKeys.members.all(workspaceId), slug],
    queryFn: () => membersApi.list(slug),
    enabled: slug.length > 0 && workspaceId.length > 0,
    staleTime: STALE.STANDARD,
  });
}

/** Any roster mutation invalidates the workspace's member list. */
function useRosterMutation<TArgs>(
  workspaceId: string,
  fn: (args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.members.all(workspaceId) }),
  });
}

export function useInviteMember(slug: string, workspaceId: string) {
  return useRosterMutation(workspaceId, (body: InviteMemberBody) =>
    membersApi.invite(slug, body),
  );
}

export function useResendInvite(slug: string, workspaceId: string) {
  return useRosterMutation(workspaceId, (invId: string) =>
    membersApi.resend(slug, invId),
  );
}

export function useRevokeInvite(slug: string, workspaceId: string) {
  return useRosterMutation(workspaceId, (invId: string) =>
    membersApi.revoke(slug, invId),
  );
}

export function useUpdateMemberRole(slug: string, workspaceId: string) {
  return useRosterMutation(
    workspaceId,
    (args: { memberId: string; body: UpdateMemberRoleBody }) =>
      membersApi.updateRole(slug, args.memberId, args.body),
  );
}

export function useRemoveMember(slug: string, workspaceId: string) {
  return useRosterMutation(workspaceId, (memberId: string) =>
    membersApi.remove(slug, memberId),
  );
}

/* ----- token-based acceptance (the public /invite/accept page) ----- */

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: queryKeys.members.invitePreview(token),
    queryFn: () => membersApi.preview(token),
    enabled: token.length > 0,
    retry: false,
    staleTime: STALE.STANDARD,
  });
}

export function useAcceptInvite(token: string) {
  return useMutation({ mutationFn: () => membersApi.accept(token) });
}

export function useClaimInvite(token: string) {
  return useMutation({
    mutationFn: (body: ClaimInviteBody) => membersApi.claim(token, body),
  });
}

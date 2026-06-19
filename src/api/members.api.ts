import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type {
  AcceptInviteResult,
  ClaimInviteBody,
  ClaimInviteResult,
  InvitationResult,
  InviteMemberBody,
  InvitePreview,
  MemberRoster,
  RosterMember,
  UpdateMemberRoleBody,
} from '@/types/api';

/** Workspace member management + token-based invite acceptance. */
export const membersApi = {
  list: (slug: string) => apiGet<MemberRoster>(endpoints.members.list(slug)),

  invite: (slug: string, body: InviteMemberBody) =>
    apiPost<InvitationResult>(endpoints.members.invitations(slug), body),

  resend: (slug: string, invId: string) =>
    apiPost<InvitationResult>(endpoints.members.resend(slug, invId), {}),

  revoke: (slug: string, invId: string) =>
    apiDelete<void>(endpoints.members.invitation(slug, invId)),

  updateRole: (slug: string, memberId: string, body: UpdateMemberRoleBody) =>
    apiPatch<RosterMember>(endpoints.members.role(slug, memberId), body),

  remove: (slug: string, memberId: string) =>
    apiDelete<void>(endpoints.members.member(slug, memberId)),

  /* ----- token-based acceptance (no workspace context) ----- */

  preview: (token: string) =>
    apiGet<InvitePreview>(endpoints.invitations.preview(token)),

  accept: (token: string) =>
    apiPost<AcceptInviteResult>(endpoints.invitations.accept(token), {}),

  claim: (token: string, body: ClaimInviteBody) =>
    apiPost<ClaimInviteResult>(endpoints.invitations.claim(token), body),
};

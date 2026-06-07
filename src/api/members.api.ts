import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type { InviteMemberBody, Member, WorkspaceRole } from '@/types/api';

export const membersApi = {
  list: () => apiGet<Member[]>(endpoints.members.list),

  invite: (body: InviteMemberBody) =>
    apiPost<Member>(endpoints.members.invite, body),

  updateRole: (memberId: string, role: WorkspaceRole) =>
    apiPatch<Member>(endpoints.members.role(memberId), { role }),

  remove: (memberId: string) =>
    apiDelete<void>(endpoints.members.byId(memberId)),
};

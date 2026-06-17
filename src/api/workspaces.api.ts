import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type {
  CreateWorkspaceBody,
  CurrentWorkspace,
  WorkspaceSummary,
} from '@/types/api';

/** Raw workspace endpoint calls. Hooks wrap these (see hooks/use-workspaces). */
export const workspacesApi = {
  listMine: () => apiGet<WorkspaceSummary[]>(endpoints.workspaces.mine),

  getBySlug: (slug: string) =>
    apiGet<CurrentWorkspace>(endpoints.workspaces.bySlug(slug)),

  create: (serviceKey: string, body: CreateWorkspaceBody) =>
    apiPost<WorkspaceSummary>(
      endpoints.services.createWorkspace(serviceKey),
      body,
    ),
};

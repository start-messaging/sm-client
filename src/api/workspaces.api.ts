import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type {
  CreatedWorkspace,
  CreateWorkspaceBody,
  CurrentWorkspace,
  WorkspaceSummary,
} from '@/types/api';

export const workspacesApi = {
  list: () => apiGet<WorkspaceSummary[]>(endpoints.workspaces.list),

  current: () => apiGet<CurrentWorkspace>(endpoints.workspaces.current),

  create: (body: CreateWorkspaceBody) =>
    apiPost<CreatedWorkspace>(endpoints.workspaces.create, body),
};

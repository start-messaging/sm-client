import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

export interface MetaFlow {
  id: string;
  metaFlowId: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'THROTTLED';
  categories: string[];
  syncedAt: string;
}

export const metaFlowsApi = {
  list: (slug: string) => apiGet<MetaFlow[]>(endpoints.metaFlows.list(slug)),
  sync: (slug: string) => apiPost<MetaFlow[]>(endpoints.metaFlows.sync(slug)),
};

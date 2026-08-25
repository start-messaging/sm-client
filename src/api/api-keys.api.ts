import { apiDelete, apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResult {
  key: ApiKey;
  rawKey: string;
}

export interface ApiKeyListResult {
  apiKeys: ApiKey[];
}

export const apiKeysApi = {
  list: (slug: string) =>
    apiGet<ApiKeyListResult>(endpoints.apiKeys.list(slug)),
  create: (slug: string, body: { name: string }) =>
    apiPost<CreateApiKeyResult>(endpoints.apiKeys.create(slug), body),
  revoke: (slug: string, id: string) =>
    apiDelete<void>(endpoints.apiKeys.revoke(slug, id)),
};

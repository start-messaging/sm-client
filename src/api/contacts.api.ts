import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WaContact {
  id: string;
  name: string | null;
  phoneE164: string;
  email: string | null;
  tags: string[];
  optedIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListResult {
  contacts: WaContact[];
  total: number;
}

export interface CreateContactBody {
  name?: string;
  phoneE164: string;
  email?: string;
  tags?: string[];
}

export interface UpdateContactBody {
  name?: string;
  email?: string;
  tags?: string[];
  optedIn?: boolean;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const contactsApi = {
  list: (slug: string) =>
    apiGet<ContactListResult>(endpoints.contacts.list(slug)),

  create: (slug: string, body: CreateContactBody) =>
    apiPost<WaContact>(endpoints.contacts.create(slug), body),

  update: (slug: string, id: string, body: UpdateContactBody) =>
    apiPatch<WaContact>(endpoints.contacts.update(slug, id), body),

  delete: (slug: string, id: string) =>
    apiDelete<void>(endpoints.contacts.delete(slug, id)),

  import: (slug: string, formData: FormData) =>
    apiPost<{ imported: number; skipped: number }>(
      endpoints.contacts.import(slug),
      formData,
    ),
};

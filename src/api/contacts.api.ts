import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type ContactSource = 'whatsapp' | 'manual' | 'csv' | 'link';

export interface WaContact {
  id: string;
  name: string | null;
  phoneE164: string;
  email: string | null;
  tags: string[];
  optedIn: boolean;
  createdAt: string;
  updatedAt: string;
  /** CRM fields (Slice 1) */
  source?: ContactSource;
  attributes?: Record<string, string>;
  followUpAt?: string | null;
  pipelineStageId?: string | null;
  assignedToUserId?: string | null;
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
  /** CRM rail fields (Slice 1 additions) */
  attributes?: Record<string, string>;
  followUpAt?: string | null;
  pipelineStageId?: string | null;
  assignedToUserId?: string | null;
}

export interface ContactNote {
  id: string;
  contactId: string;
  body: string;
  authorUserId: string;
  createdAt: string;
}

export interface ContactNoteListResult {
  notes: ContactNote[];
}

export interface AddNoteBody {
  body: string;
}

export interface ImportContactsResult {
  imported: number;
  skipped: number;
}

/** `mapping` values: `phone` | `name` | `email` | `tag` | `attr:<key>`. */
export interface ImportContactsMappedBody {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const contactsApi = {
  list: (slug: string, params?: { search?: string }) =>
    apiGet<ContactListResult>(endpoints.contacts.list(slug, params)),

  getById: (slug: string, id: string) =>
    apiGet<WaContact>(endpoints.contacts.byId(slug, id)),

  create: (slug: string, body: CreateContactBody) =>
    apiPost<WaContact>(endpoints.contacts.create(slug), body),

  update: (slug: string, id: string, body: UpdateContactBody) =>
    apiPatch<WaContact>(endpoints.contacts.update(slug, id), body),

  delete: (slug: string, id: string) =>
    apiDelete<void>(endpoints.contacts.delete(slug, id)),

  /** Field-mapped CSV import (Track 6b): client parses the CSV, server validates + inserts. */
  importMapped: (slug: string, body: ImportContactsMappedBody) =>
    apiPost<ImportContactsResult>(endpoints.contacts.import(slug), body),

  listNotes: (slug: string, contactId: string) =>
    apiGet<ContactNoteListResult>(endpoints.contacts.notes(slug, contactId)),

  addNote: (slug: string, contactId: string, body: AddNoteBody) =>
    apiPost<ContactNote>(endpoints.contacts.notes(slug, contactId), body),
};

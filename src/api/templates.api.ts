import { apiDelete, apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type TemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED';

export type TemplateCategory =
  | 'MARKETING'
  | 'UTILITY'
  | 'AUTHENTICATION';

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  text?: string;
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

export interface WaTemplate {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: TemplateComponent[];
  /** Reason string from Meta when status is REJECTED. */
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResult {
  templates: WaTemplate[];
  total: number;
}

export interface CreateTemplateBody {
  name: string;
  language: string;
  category: TemplateCategory;
  components: TemplateComponent[];
}

// ── API calls ──────────────────────────────────────────────────────────────

export const templatesApi = {
  list: (slug: string) =>
    apiGet<TemplateListResult>(endpoints.templates.list(slug)),

  create: (slug: string, body: CreateTemplateBody) =>
    apiPost<WaTemplate>(endpoints.templates.create(slug), body),

  delete: (slug: string, id: string) =>
    apiDelete<void>(endpoints.templates.delete(slug, id)),

  sync: (slug: string) =>
    apiPost<TemplateListResult>(endpoints.templates.sync(slug), {}),
};

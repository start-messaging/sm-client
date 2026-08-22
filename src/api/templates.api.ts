import { apiDelete, apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type TemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED';

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

/**
 * One button in a BUTTONS component.
 * Matches Meta Business Management API template button shapes:
 *   QUICK_REPLY  → { type, text }
 *   URL          → { type, text, url, example?: [string] }
 *   PHONE_NUMBER → { type, text, phone_number }
 */
export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  /** URL buttons: website URL, may contain one {{1}} variable at the end. */
  url?: string;
  /**
   * URL buttons: sample for the {{1}} variable (suffix only, e.g. ["summer2023"]).
   * Single-element array.
   */
  example?: string[];
  /** PHONE_NUMBER buttons: E.164 phone number. */
  phone_number?: string;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  text?: string;
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  example?: {
    body_text?: string[][];
    header_text?: string[];
  };
  /** BUTTONS component only: 1–3 buttons. */
  buttons?: TemplateButton[];
}

export interface WaTemplate {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  /** Category submitted at create time; differs from `category` after Meta recategorizes. */
  submittedCategory: TemplateCategory | null;
  /** Impending Meta category when a 24h recategorization is scheduled. */
  correctCategory: TemplateCategory | null;
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

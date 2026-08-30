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
 * One button in a BUTTONS component (Meta API shape, used in TemplateComponent).
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

/**
 * Flattened button shape returned by the server on WaTemplate.buttons.
 * Wider type set than the Meta-raw TemplateButton — includes Feature-5A types.
 */
export interface WaTemplateButton {
  type:
    | 'QUICK_REPLY'
    | 'URL'
    | 'PHONE_NUMBER'
    | 'COPY_CODE'
    | 'REQUEST_CONTACT_INFO'
    | 'OTP';
  text: string;
  url?: string;
  phoneNumber?: string;
  example?: string;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  text?: string;
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  /** HEADER component only: publicly accessible media URL when format isn't TEXT. */
  link?: string;
  example?: {
    body_text?: string[][];
    header_text?: string[];
    header_handle?: string[];
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
  /** Meta quality signal: 'HIGH' | 'MEDIUM' | 'LOW'. Null until first quality webhook. */
  qualityScore: string | null;
  createdAt: string;
  updatedAt: string;
  // Feature 5A — advanced template components
  hasButtons: boolean;
  buttons: WaTemplateButton[] | null;
  templateSubtype: 'standard' | 'lto' | 'authentication' | 'carousel';
  isCarousel: boolean;
  carouselCardCount: number | null;
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

  uploadMedia: (slug: string, file: File): Promise<{ handle: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiPost<{ handle: string }>(endpoints.templates.mediaUpload(slug), form);
  },
};

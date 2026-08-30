import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'FAILED';

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  templateName: string;
  templateLanguage: string;
  /** IDs of the contact lists / segments to send to. */
  audienceIds: string[];
  scheduledAt: string | null;
  launchedAt: string | null;
  completedAt: string | null;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  /** Feature 6 — contacts skipped because they are opted out. */
  skippedOptedOut: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListResult {
  campaigns: Campaign[];
  total: number;
}

export interface CampaignAnalyticsPoint {
  date: string;
  delivered: number;
  read: number;
  failed: number;
}

export interface CampaignAnalytics {
  stats: Campaign['stats'];
  timeseries: CampaignAnalyticsPoint[];
}

/** A validated row saved onto a campaign's CSV audience (Track 5c). */
export interface CampaignAudienceCsvEntry {
  phoneE164: string;
  name?: string;
  attrs?: Record<string, string>;
}

export interface UploadAudienceCsvResult {
  campaign: Campaign;
  added: number;
  skippedInvalidPhone: number;
  skippedDuplicate: number;
  skippedOptedOut: number;
}

export interface CreateCampaignBody {
  name: string;
  templateName: string;
  templateLanguage: string;
  audienceIds: string[];
  scheduledAt?: string;
  /** Per-variable contact field mapping, e.g. { "1": "name", "2": "phone", "3": "attr:company" }. */
  variableMapping?: Record<string, string>;
  flowId?: string;
}

export interface UpdateCampaignBody {
  name?: string;
  templateName?: string;
  templateLanguage?: string;
  audienceIds?: string[];
  scheduledAt?: string | null;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const campaignsApi = {
  list: (slug: string) =>
    apiGet<CampaignListResult>(endpoints.campaigns.list(slug)),

  create: (slug: string, body: CreateCampaignBody) =>
    apiPost<Campaign>(endpoints.campaigns.create(slug), body),

  update: (slug: string, id: string, body: UpdateCampaignBody) =>
    apiPatch<Campaign>(endpoints.campaigns.update(slug, id), body),

  delete: (slug: string, id: string) =>
    apiDelete<void>(endpoints.campaigns.delete(slug, id)),

  launch: (slug: string, id: string) =>
    apiPost<Campaign>(endpoints.campaigns.launch(slug, id), {}),

  pause: (slug: string, id: string) =>
    apiPost<Campaign>(endpoints.campaigns.pause(slug, id), {}),

  resume: (slug: string, id: string) =>
    apiPost<Campaign>(endpoints.campaigns.resume(slug, id), {}),

  duplicate: (slug: string, id: string) =>
    apiPost<Campaign>(endpoints.campaigns.duplicate(slug, id), {}),

  getAnalytics: (slug: string, id: string) =>
    apiGet<CampaignAnalytics>(endpoints.campaigns.analytics(slug, id)),

  uploadAudienceCsv: (
    slug: string,
    id: string,
    rows: Record<string, string>[],
  ) =>
    apiPost<UploadAudienceCsvResult>(
      endpoints.campaigns.audienceCsv(slug, id),
      {
        rows,
      },
    ),

  getLastMarketingSend: (slug: string) =>
    apiGet<{ lastSentAt: string | null }>(
      endpoints.campaigns.lastMarketingSend(slug),
    ),
};

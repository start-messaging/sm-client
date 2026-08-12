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
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListResult {
  campaigns: Campaign[];
  total: number;
}

export interface CreateCampaignBody {
  name: string;
  templateName: string;
  templateLanguage: string;
  audienceIds: string[];
  scheduledAt?: string;
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
};

import { apiGet } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

export interface AnalyticsOverviewAgent {
  userId: string;
  name: string;
  handled: number;
}

export interface AnalyticsOverview {
  conversationsToday: number;
  resolvedToday: number;
  avgResponseMinutes: number;
  topAgents: AnalyticsOverviewAgent[];
}

export const analyticsApi = {
  getOverview: (slug: string) =>
    apiGet<AnalyticsOverview>(endpoints.analytics.overview(slug)),
};

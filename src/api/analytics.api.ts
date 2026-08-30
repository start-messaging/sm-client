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

export interface AgentStat {
  userId: string;
  name: string;
  conversationsHandled: number;
  messagesSent: number;
  resolutionMinutes: number | null;
}

export interface MessageError {
  errorCode: number | null;
  errorReason: string;
  count: number;
  lastOccurredAt: string;
  fix: string;
}

function buildDateParams(from?: string, to?: string): string {
  if (!from) return '';
  return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to ?? new Date().toISOString().slice(0, 10))}`;
}

export const analyticsApi = {
  getOverview: (slug: string) =>
    apiGet<AnalyticsOverview>(endpoints.analytics.overview(slug)),
  getAgentStats: (slug: string, from?: string, to?: string) =>
    apiGet<{ agents: AgentStat[] }>(
      `${endpoints.analytics.agentStats(slug)}${buildDateParams(from, to)}`,
    ),
  getMessageErrors: (slug: string, from?: string, to?: string) =>
    apiGet<{ errors: MessageError[] }>(
      `${endpoints.analytics.messageErrors(slug)}${buildDateParams(from, to)}`,
    ),
};

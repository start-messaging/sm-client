import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http';
import { endpoints } from './endpoints';

export type AutoReplyMatchType = 'exact' | 'contains' | 'starts_with';
export type AutoReplyType = 'text' | 'template';

/** Mirrors WaAutoReplyRule serialised by the server's auto-reply rules service. */
export interface WaAutoReplyRule {
  id: string;
  name: string;
  keywords: string[];
  matchType: AutoReplyMatchType;
  replyType: AutoReplyType;
  replyText: string | null;
  replyTemplateName: string | null;
  replyTemplateLanguage: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutoReplyRuleBody {
  name: string;
  keywords: string[];
  matchType: AutoReplyMatchType;
  replyType: AutoReplyType;
  replyText?: string;
  replyTemplateName?: string;
  replyTemplateLanguage?: string;
  isActive?: boolean;
  priority?: number;
}

export type UpdateAutoReplyRuleBody = Partial<CreateAutoReplyRuleBody>;

export const autoReplyRulesApi = {
  list: (slug: string): Promise<{ rules: WaAutoReplyRule[] }> =>
    apiGet(endpoints.autoReplies.list(slug)),

  create: (
    slug: string,
    input: CreateAutoReplyRuleBody,
  ): Promise<WaAutoReplyRule> =>
    apiPost(endpoints.autoReplies.create(slug), input),

  update: (
    slug: string,
    id: string,
    input: UpdateAutoReplyRuleBody,
  ): Promise<WaAutoReplyRule> =>
    apiPatch(endpoints.autoReplies.byId(slug, id), input),

  delete: (slug: string, id: string): Promise<void> =>
    apiDelete(endpoints.autoReplies.byId(slug, id)),
};

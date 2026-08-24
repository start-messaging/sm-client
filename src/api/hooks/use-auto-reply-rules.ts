import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  autoReplyRulesApi,
  type CreateAutoReplyRuleBody,
  type UpdateAutoReplyRuleBody,
} from '@/api/auto-reply-rules.api';
import { STALE } from '@/lib/query-client';

/** Local query keys — avoid touching shared query-keys.ts. */
const qk = {
  all: (slug: string) => ['auto-reply-rules', slug] as const,
};

export function useAutoReplyRules(slug: string) {
  return useQuery({
    queryKey: qk.all(slug),
    queryFn: () => autoReplyRulesApi.list(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
    select: (d) => d.rules,
  });
}

function useAutoReplyRuleMutation<TArgs>(
  slug: string,
  fn: (args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all(slug) }),
  });
}

export function useCreateAutoReplyRule(slug: string) {
  return useAutoReplyRuleMutation(slug, (body: CreateAutoReplyRuleBody) =>
    autoReplyRulesApi.create(slug, body),
  );
}

export function useUpdateAutoReplyRule(slug: string) {
  return useAutoReplyRuleMutation(
    slug,
    (args: { id: string; body: UpdateAutoReplyRuleBody }) =>
      autoReplyRulesApi.update(slug, args.id, args.body),
  );
}

export function useDeleteAutoReplyRule(slug: string) {
  return useAutoReplyRuleMutation(slug, (id: string) =>
    autoReplyRulesApi.delete(slug, id),
  );
}

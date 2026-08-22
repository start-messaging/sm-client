import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  quickRepliesApi,
  type CreateQuickReplyBody,
  type UpdateQuickReplyBody,
} from '@/api/quick-replies.api';
import { STALE } from '@/lib/query-client';

/** Local query keys — avoid touching shared query-keys.ts. */
const qk = {
  all: (slug: string) => ['quick-replies', slug] as const,
};

export function useQuickReplies(slug: string) {
  return useQuery({
    queryKey: qk.all(slug),
    queryFn: () => quickRepliesApi.list(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
    select: (d) => d.quickReplies,
  });
}

function useQuickReplyMutation<TArgs>(
  slug: string,
  fn: (args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all(slug) }),
  });
}

export function useCreateQuickReply(slug: string) {
  return useQuickReplyMutation(slug, (body: CreateQuickReplyBody) =>
    quickRepliesApi.create(slug, body),
  );
}

export function useUpdateQuickReply(slug: string) {
  return useQuickReplyMutation(
    slug,
    (args: { id: string; body: UpdateQuickReplyBody }) =>
      quickRepliesApi.update(slug, args.id, args.body),
  );
}

export function useDeleteQuickReply(slug: string) {
  return useQuickReplyMutation(slug, (id: string) =>
    quickRepliesApi.delete(slug, id),
  );
}

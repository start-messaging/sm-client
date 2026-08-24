import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  contactsApi,
  type CreateContactBody,
  type ImportContactsMappedBody,
  type UpdateContactBody,
} from '@/api/contacts.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

export function useContacts(slug: string, search?: string) {
  return useQuery({
    queryKey: queryKeys.contacts.all(slug, search),
    queryFn: () => contactsApi.list(slug, { search }),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

/** Lightweight total-only count — used by the sidebar plan card. */
export function useContactsCount(slug: string) {
  return useQuery({
    queryKey: queryKeys.contacts.count(slug),
    queryFn: () => contactsApi.list(slug, {}),
    enabled: slug.length > 0,
    staleTime: STALE.STATIC,
    select: (data) => data.total,
  });
}

function useContactMutation<TArgs>(
  slug: string,
  fn: (args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all(slug) }),
  });
}

export function useCreateContact(slug: string) {
  return useContactMutation(slug, (body: CreateContactBody) =>
    contactsApi.create(slug, body),
  );
}

export function useUpdateContact(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; body: UpdateContactBody }) =>
      contactsApi.update(slug, args.id, args.body),
    onSuccess: (_data, args) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(slug) });
      void qc.invalidateQueries({
        queryKey: queryKeys.contacts.byId(slug, args.id),
      });
    },
  });
}

export function useDeleteContact(slug: string) {
  return useContactMutation(slug, (id: string) => contactsApi.delete(slug, id));
}

export function useImportContactsMapped(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ImportContactsMappedBody) =>
      contactsApi.importMapped(slug, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(slug) }),
  });
}

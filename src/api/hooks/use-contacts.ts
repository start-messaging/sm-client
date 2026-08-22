import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  contactsApi,
  type CreateContactBody,
  type UpdateContactBody,
} from '@/api/contacts.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

export function useContacts(slug: string) {
  return useQuery({
    queryKey: queryKeys.contacts.all(slug),
    queryFn: () => contactsApi.list(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
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

export function useImportContacts(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => contactsApi.import(slug, formData),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: queryKeys.contacts.all(slug) }),
  });
}

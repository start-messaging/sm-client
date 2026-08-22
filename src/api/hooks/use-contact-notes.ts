import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactsApi, type AddNoteBody } from '@/api/contacts.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

export function useContactNotes(slug: string, contactId: string | null) {
  return useQuery({
    queryKey: queryKeys.contacts.notes(slug, contactId ?? ''),
    queryFn: () => contactsApi.listNotes(slug, contactId!),
    enabled: slug.length > 0 && !!contactId,
    staleTime: STALE.STANDARD,
  });
}

export function useAddContactNote(slug: string, contactId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddNoteBody) =>
      contactsApi.addNote(slug, contactId!, body),
    onSuccess: () => {
      if (contactId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.contacts.notes(slug, contactId),
        });
      }
    },
  });
}

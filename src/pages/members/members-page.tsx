import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { useQueryParam } from '@/hooks/use-query-param';
import { useMembers } from '@/api/hooks/use-members';
import { MembersTable } from './components/members-table';

/**
 * Members list with a URL-synced search filter (?q=). `useQueryParam` keeps the
 * input responsive while debouncing the URL write — the URL is the source of
 * truth, so the view is shareable/bookmarkable and the Back button works.
 * Filtering uses the debounced value (here client-side; a server search would
 * pass it to the query hook the same way).
 */
export function MembersPage() {
  const { t } = useTranslation();
  const { value, debouncedValue, setValue } = useQueryParam('q');
  const { data: members, isLoading } = useMembers();

  const needle = debouncedValue.toLowerCase();
  const filtered = (members ?? []).filter(
    (m) => !needle || m.userId.toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('shell.members')}
        </h1>
        <Input
          className="max-w-xs"
          placeholder={t('common.search')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <MembersTable members={filtered} isLoading={isLoading} />
    </div>
  );
}

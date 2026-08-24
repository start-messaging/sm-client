import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWabaStatus } from '@/api/hooks/use-whatsapp';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';

/**
 * Sticky amber banner shown on any page when the WABA is not connected.
 * Data stays in the DB; this just informs the user things are read-only.
 */
export function DisconnectedBanner() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data } = useWabaStatus(ws.slug);

  if (!data || data.status !== 'not_connected') return null;

  return (
    <div className="flex items-center gap-2.5 rounded-[8px] border border-[#fcd34d] bg-[#fef9c3] px-3 py-2.5 text-[12px]">
      <AlertTriangle className="size-3.5 shrink-0 text-[#d97706]" />
      <span className="text-[#92400e] flex-1">
        {t('whatsapp.disconnectedBanner.body')}
      </span>
      <Link
        to={`/w/${ws.slug}/connect`}
        className="shrink-0 font-medium text-[#92400e] underline underline-offset-2 hover:text-[#78350f]"
      >
        {t('whatsapp.disconnectedBanner.cta')}
      </Link>
    </div>
  );
}

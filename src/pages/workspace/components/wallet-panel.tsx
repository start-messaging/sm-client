import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTip } from '@/components/shared/info-tip';
import { useWorkspaceWallet } from '@/api/hooks/use-workspaces';
import { formatMoney } from '@/lib/money';

/**
 * Read-only workspace balance (parked for a future Solution Partner path).
 * Tech Provider WhatsApp does not charge messages from this wallet — Meta
 * bills conversations; we bill CRM subscription. No Add-funds CTA.
 */
export function WalletPanel({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useWorkspaceWallet(slug);

  const held = data && Number(data.heldMicros) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-5" />
          {t('workspace.wallet.title')}
          <InfoTip content={t('workspace.wallet.hint')} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="text-muted-foreground text-sm">
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="font-mono text-3xl font-semibold">
              {formatMoney(data.balanceMicros, data.currency)}
            </div>
            <div className="text-muted-foreground text-sm">
              {t('workspace.wallet.available')}
              {held
                ? ` · ${t('workspace.wallet.held', {
                    amount: formatMoney(data.heldMicros, data.currency),
                  })}`
                : ''}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

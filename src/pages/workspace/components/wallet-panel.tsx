import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { InfoTip } from '@/components/shared/info-tip';
import { useWorkspaceWallet } from '@/api/hooks/use-workspaces';
import { formatMoney } from '@/lib/money';

/**
 * "Wallet": the workspace's read-only prepaid balance. Recharge is disabled
 * until the payments slice — the server is the authority on the balance, and
 * spend (per-message debits) lands with messaging.
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
      <CardFooter>
        <Button variant="outline" disabled>
          {t('workspace.wallet.addFunds')}
        </Button>
        <span className="text-muted-foreground ml-3 text-xs">
          {t('workspace.wallet.addFundsSoon')}
        </span>
      </CardFooter>
    </Card>
  );
}

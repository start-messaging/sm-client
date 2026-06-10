import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { ServiceStatus, type PublicService } from '@/types/api';
import { toast } from '@/lib/toast';

/** One available service on the no-workspace home. CTA stubs the next slice. */
export function ServiceCard({ service }: { service: PublicService }) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xs font-bold">
            {service.short}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{service.name}</span>
              {service.status === ServiceStatus.BETA && (
                <Badge variant="secondary">{t('home.badge.beta')}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-muted-foreground text-sm">
          {service.description ?? ''}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={() => toast.info(t('home.workspaceComingSoon'))}
        >
          {t('home.startWorkspace')}
        </Button>
      </CardFooter>
    </Card>
  );
}

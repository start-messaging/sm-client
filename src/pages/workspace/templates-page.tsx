import { useTranslation } from 'react-i18next';
import { LayoutTemplate, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useTemplates, useSyncTemplates } from '@/api/hooks/use-templates';
import { toast } from '@/lib/toast';
import type { TemplateStatus } from '@/api/templates.api';
import { CreateTemplateDialog } from './components/create-template-dialog';

const STATUS_VARIANT: Record<
  TemplateStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  APPROVED: 'default',
  PENDING: 'secondary',
  REJECTED: 'destructive',
  PAUSED: 'outline',
  DISABLED: 'outline',
};

export function TemplatesPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data, isLoading } = useTemplates(ws.slug);
  const syncTemplates = useSyncTemplates(ws.slug);

  const templates = data?.templates ?? [];

  function handleSync() {
    syncTemplates.mutate(undefined, {
      onSuccess: () => toast.success('Templates synced'),
      onError: (err) => toast.error(err),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('templates.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('templates.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncTemplates.isPending}
          >
            <RefreshCw
              className={`mr-1.5 size-3.5 ${syncTemplates.isPending ? 'animate-spin' : ''}`}
            />
            {t('templates.syncCta')}
          </Button>
          <CreateTemplateDialog slug={ws.slug} />
        </div>
      </div>

      <EducationSlot
        title={t('templates.intro.title')}
        body={t('templates.intro.body')}
        docsUrl="https://developers.facebook.com/docs/whatsapp/message-templates"
      />

      {isLoading && (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      )}

      {!isLoading && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <LayoutTemplate className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">{t('templates.empty.title')}</p>
              <p className="text-muted-foreground text-sm">
                {t('templates.empty.body')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && templates.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-mono text-sm">{tpl.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{tpl.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {tpl.language}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[tpl.status]}>
                      {t(`templates.status.${tpl.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

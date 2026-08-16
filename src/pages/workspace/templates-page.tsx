import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutTemplate, RefreshCw, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  useTemplates,
  useSyncTemplates,
  useDeleteTemplate,
} from '@/api/hooks/use-templates';
import { toast } from '@/lib/toast';
import type { TemplateStatus, WaTemplate } from '@/api/templates.api';
import {
  CreateTemplateDialog,
  seedFromExample,
  type CreateTemplateSeed,
} from './components/create-template-dialog';
import { TemplateExamplesGallery } from './components/template-examples-gallery';
import type { TemplateExample } from '@/lib/template-examples';

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

/** Auto-sync PENDING templates at most once per workspace per tab (2 min). */
const SYNC_TTL_MS = 2 * 60 * 1000;

function rejectionLabel(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  reason: string,
): string {
  const key = `templates.rejection.${reason}`;
  const translated = t(key, { defaultValue: '' });
  return translated || reason;
}

export function TemplatesPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data, isLoading } = useTemplates(ws.slug);
  const syncTemplates = useSyncTemplates(ws.slug);
  const deleteTemplate = useDeleteTemplate(ws.slug);
  /** Manual Sync only — auto-sync must not spin the button forever. */
  const [manualSyncing, setManualSyncing] = useState(false);
  const autoSynced = useRef(false);

  const [seed, setSeed] = useState<CreateTemplateSeed | null>(null);
  const [seedKey, setSeedKey] = useState(0);

  const templates = data?.templates ?? [];
  const hasPending = templates.some((tpl) => tpl.status === 'PENDING');

  useEffect(() => {
    if (!ws.slug || autoSynced.current || isLoading) return;
    // Only poll Meta while something is still in review.
    if (!hasPending) return;

    const key = `wa:tpl-sync:${ws.slug}`;
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < SYNC_TTL_MS) return;

    autoSynced.current = true;
    // Stamp before the request so Strict Mode remounts / HMR don't loop.
    sessionStorage.setItem(key, String(Date.now()));
    syncTemplates.mutate(undefined, {
      onError: () => {
        // Silent on auto-sync — manual Sync still available.
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.slug, isLoading, hasPending]);

  function handleSync() {
    setManualSyncing(true);
    syncTemplates.mutate(undefined, {
      onSuccess: () => {
        sessionStorage.setItem(`wa:tpl-sync:${ws.slug}`, String(Date.now()));
        toast.success(t('templates.syncSuccess'));
      },
      onError: (err) => toast.error(err),
      onSettled: () => setManualSyncing(false),
    });
  }

  function handleDelete(tpl: WaTemplate) {
    deleteTemplate.mutate(tpl.id, {
      onSuccess: () => toast.success(t('templates.deleteSuccess')),
      onError: (err) => toast.error(err),
    });
  }

  function handleApplyExample(example: TemplateExample) {
    setSeed(seedFromExample(example));
    setSeedKey((k) => k + 1);
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
            disabled={manualSyncing}
          >
            <RefreshCw
              className={`mr-1.5 size-3.5 ${manualSyncing ? 'animate-spin' : ''}`}
            />
            {t('templates.syncCta')}
          </Button>
          <CreateTemplateDialog
            slug={ws.slug}
            seed={seed}
            seedKey={seedKey}
            onSeedConsumed={() => setSeed(null)}
          />
        </div>
      </div>

      <EducationSlot
        title={t('templates.intro.title')}
        body={t('templates.intro.body')}
        docsUrl="https://developers.facebook.com/docs/whatsapp/message-templates"
      />

      <TemplateExamplesGallery onApply={handleApplyExample} />

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
                <TableHead>{t('templates.table.name')}</TableHead>
                <TableHead>{t('templates.table.category')}</TableHead>
                <TableHead>{t('templates.table.language')}</TableHead>
                <TableHead>{t('templates.table.status')}</TableHead>
                <TableHead className="w-[56px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm">{tpl.name}</span>
                      {tpl.status === 'REJECTED' && tpl.rejectionReason && (
                        <span className="text-destructive text-xs">
                          {rejectionLabel(t, tpl.rejectionReason)}
                        </span>
                      )}
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          disabled={deleteTemplate.isPending}
                          aria-label={t('templates.deleteCta')}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('templates.deleteTitle')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('templates.deleteBody', { name: tpl.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t('common.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(tpl)}
                          >
                            {t('templates.deleteCta')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

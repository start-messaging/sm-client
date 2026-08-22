import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Plus, Slash, RotateCcw } from 'lucide-react';
import { EducationSlot } from '@/components/education/education-slot';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateQuickReply,
  useDeleteQuickReply,
  useQuickReplies,
  useUpdateQuickReply,
} from '@/api/hooks/use-quick-replies';
import {
  useInboxSettings,
  usePatchInboxSettings,
} from '@/api/hooks/use-inbox-settings';
import { Switch } from '@/components/ui/switch';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { toast } from '@/lib/toast';
import { ROLE_RANK, WorkspaceRole, type QuickReply } from '@/types/api';
import { isApiError } from '@/types/error';

/* ------------------------------------------------------------------ helpers */

interface FormState {
  title: string;
  body: string;
  shortcut: string;
}

const EMPTY: FormState = { title: '', body: '', shortcut: '' };

function validateForm(f: FormState): Partial<Record<keyof FormState, string>> {
  const errs: Partial<Record<keyof FormState, string>> = {};
  if (!f.title.trim()) errs.title = 'required';
  if (!f.body.trim()) errs.body = 'required';
  if (!f.shortcut.trim()) errs.shortcut = 'required';
  if (f.shortcut && !/^[a-z0-9_-]+$/i.test(f.shortcut.replace(/^\//, ''))) {
    errs.shortcut = 'alphanumeric';
  }
  return errs;
}

/* ------------------------------------------------------------------ dialog */

interface QuickReplyDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: QuickReply;
  slug: string;
}

function QuickReplyDialog({
  open,
  onOpenChange,
  initial,
  slug,
}: QuickReplyDialogProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(initial);

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? { title: initial.title, body: initial.body, shortcut: initial.shortcut }
      : EMPTY,
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const create = useCreateQuickReply(slug);
  const update = useUpdateQuickReply(slug);
  const isPending = create.isPending || update.isPending;

  function resetAndClose() {
    setForm(EMPTY);
    setFieldErrors({});
    onOpenChange(false);
  }

  function onFieldChange(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    const onError = (err: unknown) => {
      if (isApiError(err) && err.code === 'QUICK_REPLY_DUPLICATE') {
        toast.error(err.message);
      } else {
        toast.error(err);
      }
    };

    if (isEdit && initial) {
      update.mutate(
        { id: initial.id, body: form },
        {
          onSuccess: () => {
            toast.success(t('settings.quickReplies.updated'));
            resetAndClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(form, {
        onSuccess: () => {
          toast.success(t('settings.quickReplies.created'));
          resetAndClose();
        },
        onError,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('settings.quickReplies.editTitle')
              : t('settings.quickReplies.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <form
          id="qr-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Field>
            <FieldLabel htmlFor="qr-title">
              {t('settings.quickReplies.fields.title')}
            </FieldLabel>
            <Input
              id="qr-title"
              value={form.title}
              onChange={(e) => onFieldChange('title', e.target.value)}
              placeholder={t('settings.quickReplies.placeholders.title')}
              disabled={isPending}
            />
            {fieldErrors.title && (
              <FieldError>
                {t('settings.quickReplies.errors.titleRequired')}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="qr-shortcut">
              {t('settings.quickReplies.fields.shortcut')}
            </FieldLabel>
            <div className="relative">
              <Slash className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="qr-shortcut"
                className="pl-8"
                value={form.shortcut}
                onChange={(e) =>
                  onFieldChange('shortcut', e.target.value.replace(/^\/+/, ''))
                }
                placeholder={t('settings.quickReplies.placeholders.shortcut')}
                disabled={isPending}
              />
            </div>
            {fieldErrors.shortcut && (
              <FieldError>
                {fieldErrors.shortcut === 'alphanumeric'
                  ? t('settings.quickReplies.errors.shortcutAlphanumeric')
                  : t('settings.quickReplies.errors.shortcutRequired')}
              </FieldError>
            )}
            <p className="text-muted-foreground text-xs">
              {t('settings.quickReplies.shortcutHint')}
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="qr-body">
              {t('settings.quickReplies.fields.body')}
            </FieldLabel>
            <Textarea
              id="qr-body"
              rows={4}
              value={form.body}
              onChange={(e) => onFieldChange('body', e.target.value)}
              placeholder={t('settings.quickReplies.placeholders.body')}
              disabled={isPending}
            />
            {fieldErrors.body && (
              <FieldError>
                {t('settings.quickReplies.errors.bodyRequired')}
              </FieldError>
            )}
          </Field>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="qr-form" disabled={isPending}>
            {isPending && <Spinner className="mr-2 size-4" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ routing card */

interface RoutingCardProps {
  slug: string;
  isAdmin: boolean;
}

function RoutingCard({ slug, isAdmin }: RoutingCardProps) {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useInboxSettings(slug);
  const patch = usePatchInboxSettings(slug);

  function toggle(
    field: 'roundRobinEnabled' | 'inboxAvailable',
    value: boolean,
  ) {
    patch.mutate(
      { [field]: value },
      {
        onError: (err) => toast.error(err),
      },
    );
  }

  return (
    <section className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="text-muted-foreground size-4" />
          <h2 className="text-sm font-semibold">
            {t('settings.routing.title')}
          </h2>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t('settings.routing.subtitle')}
        </p>
      </div>

      <div className="divide-y px-4">
        {/* Admin-only: round-robin toggle */}
        {isAdmin && (
          <div className="flex items-start justify-between gap-4 py-4">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {t('settings.routing.roundRobin.label')}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('settings.routing.roundRobin.hint')}
              </p>
            </div>
            <Switch
              checked={settings?.roundRobinEnabled ?? false}
              onCheckedChange={(v) => toggle('roundRobinEnabled', v)}
              disabled={isLoading || patch.isPending}
              aria-label={t('settings.routing.roundRobin.label')}
            />
          </div>
        )}

        {/* Every agent: availability toggle */}
        <div className="flex items-start justify-between gap-4 py-4">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {t('settings.routing.available.label')}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('settings.routing.available.hint')}
            </p>
          </div>
          <Switch
            checked={settings?.inboxAvailable ?? true}
            onCheckedChange={(v) => toggle('inboxAvailable', v)}
            disabled={isLoading || patch.isPending}
            aria-label={t('settings.routing.available.label')}
          />
        </div>
      </div>

      {/* Education note */}
      <div className="bg-muted/40 rounded-b-lg border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">
          {t('settings.routing.education')}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ page */

export function SettingsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const myRank = ROLE_RANK[ws.role];
  const canWrite = myRank >= ROLE_RANK[WorkspaceRole.ADMIN];
  const isAgent = myRank >= ROLE_RANK[WorkspaceRole.AGENT];

  const { data: replies, isLoading, isError } = useQuickReplies(ws.slug);
  const deleteReply = useDeleteQuickReply(ws.slug);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [deleting, setDeleting] = useState<QuickReply | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('settings.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('settings.subtitle')}
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            {t('settings.quickReplies.addCta')}
          </Button>
        )}
      </div>

      {/* Routing */}
      {isAgent && <RoutingCard slug={ws.slug} isAdmin={canWrite} />}

      {/* Education */}
      <EducationSlot
        title={t('settings.quickReplies.educationTitle')}
        body={t('settings.quickReplies.educationBody')}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-muted-foreground text-sm">
          {t('settings.quickReplies.loadError')}
        </p>
      ) : !replies || replies.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <Slash className="text-muted-foreground size-6" />
          </div>
          <div>
            <p className="font-medium">
              {t('settings.quickReplies.emptyTitle')}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('settings.quickReplies.emptyBody')}
            </p>
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t('settings.quickReplies.addCta')}
            </Button>
          )}
        </div>
      ) : (
        /* Table */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">
                  {t('settings.quickReplies.cols.shortcut')}
                </TableHead>
                <TableHead>{t('settings.quickReplies.cols.title')}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t('settings.quickReplies.cols.body')}
                </TableHead>
                {canWrite && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {replies.map((qr) => (
                <TableRow key={qr.id}>
                  <TableCell>
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">
                      /{qr.shortcut}
                    </code>
                  </TableCell>
                  <TableCell className="font-medium">{qr.title}</TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate md:table-cell">
                    {qr.body}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('settings.quickReplies.actions')}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(qr)}>
                            {t('settings.quickReplies.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(qr)}
                          >
                            {t('settings.quickReplies.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Read-only notice for non-admins */}
      {!canWrite && replies && replies.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t('settings.quickReplies.readOnlyNotice')}
        </p>
      )}

      {/* Add dialog */}
      <QuickReplyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        slug={ws.slug}
      />

      {/* Edit dialog */}
      {editing && (
        <QuickReplyDialog
          key={editing.id}
          open={Boolean(editing)}
          onOpenChange={(o) => !o && setEditing(null)}
          initial={editing}
          slug={ws.slug}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.quickReplies.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.quickReplies.deleteBody', {
                shortcut: deleting?.shortcut,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteReply.mutate(deleting.id, {
                  onSuccess: () =>
                    toast.success(t('settings.quickReplies.deleted')),
                  onError: (err) => toast.error(err),
                });
                setDeleting(null);
              }}
            >
              {t('settings.quickReplies.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

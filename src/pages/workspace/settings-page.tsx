import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, MoreHorizontal, Plus, Slash, RotateCcw } from 'lucide-react';
import { EducationSlot } from '@/components/education/education-slot';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  type AutoReplyMatchType,
  type AutoReplyType,
  type WaAutoReplyRule,
} from '@/api/auto-reply-rules.api';
import {
  useAutoReplyRules,
  useCreateAutoReplyRule,
  useDeleteAutoReplyRule,
  useUpdateAutoReplyRule,
} from '@/api/hooks/use-auto-reply-rules';
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
import { useTemplates } from '@/api/hooks/use-templates';
import type { WaTemplate } from '@/api/templates.api';
import { InfoTip } from '@/components/shared/info-tip';
import { Switch } from '@/components/ui/switch';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { hasFeature } from '@/lib/plan';
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

/* ------------------------------------------------------------- auto-replies */

interface AutoReplyFormState {
  name: string;
  keywords: string;
  matchType: AutoReplyMatchType;
  replyType: AutoReplyType;
  replyText: string;
  replyTemplateName: string;
  replyTemplateLanguage: string;
  priority: string;
  isActive: boolean;
}

const AUTO_REPLY_EMPTY: AutoReplyFormState = {
  name: '',
  keywords: '',
  matchType: 'contains',
  replyType: 'text',
  replyText: '',
  replyTemplateName: '',
  replyTemplateLanguage: 'en_US',
  priority: '0',
  isActive: true,
};

/** Mirrors the language list in components/template-editor-form.tsx. */
const TEMPLATE_LANGUAGES = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pt_BR', label: 'Portuguese (BR)' },
  { value: 'es', label: 'Spanish' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' },
] as const;

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function validateAutoReplyForm(
  f: AutoReplyFormState,
): Partial<Record<keyof AutoReplyFormState, string>> {
  const errs: Partial<Record<keyof AutoReplyFormState, string>> = {};
  const name = f.name.trim();
  if (!name) errs.name = 'required';
  else if (name.length > 120) errs.name = 'tooLong';
  if (parseKeywords(f.keywords).length === 0) errs.keywords = 'required';
  if (f.replyType === 'text' && !f.replyText.trim()) {
    errs.replyText = 'required';
  }
  if (f.replyType === 'template') {
    if (!f.replyTemplateName) errs.replyTemplateName = 'required';
    if (!f.replyTemplateLanguage.trim()) {
      errs.replyTemplateLanguage = 'required';
    }
  }
  if (!/^\d+$/.test(f.priority.trim())) errs.priority = 'invalid';
  return errs;
}

interface AutoReplyRuleDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: WaAutoReplyRule;
  slug: string;
  templates: WaTemplate[];
}

function AutoReplyRuleDialog({
  open,
  onOpenChange,
  initial,
  slug,
  templates,
}: AutoReplyRuleDialogProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(initial);

  const [form, setForm] = useState<AutoReplyFormState>(() =>
    initial
      ? {
          name: initial.name,
          keywords: initial.keywords.join(', '),
          matchType: initial.matchType,
          replyType: initial.replyType,
          replyText: initial.replyText ?? '',
          replyTemplateName: initial.replyTemplateName ?? '',
          replyTemplateLanguage: initial.replyTemplateLanguage ?? 'en_US',
          priority: String(initial.priority),
          isActive: initial.isActive,
        }
      : AUTO_REPLY_EMPTY,
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AutoReplyFormState, string>>
  >({});

  const create = useCreateAutoReplyRule(slug);
  const update = useUpdateAutoReplyRule(slug);
  const isPending = create.isPending || update.isPending;

  function resetAndClose() {
    setForm(AUTO_REPLY_EMPTY);
    setFieldErrors({});
    onOpenChange(false);
  }

  function onFieldChange<K extends keyof AutoReplyFormState>(
    key: K,
    value: AutoReplyFormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateAutoReplyForm(form);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    const body = {
      name: form.name.trim(),
      keywords: parseKeywords(form.keywords),
      matchType: form.matchType,
      replyType: form.replyType,
      ...(form.replyType === 'text'
        ? { replyText: form.replyText.trim() }
        : {
            replyTemplateName: form.replyTemplateName,
            replyTemplateLanguage: form.replyTemplateLanguage,
          }),
      priority: Number(form.priority),
      isActive: form.isActive,
    };

    const onError = (err: unknown) => toast.error(err);

    if (isEdit && initial) {
      update.mutate(
        { id: initial.id, body },
        {
          onSuccess: () => {
            toast.success(t('settings.autoReplies.updated'));
            resetAndClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: () => {
          toast.success(t('settings.autoReplies.created'));
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
              ? t('settings.autoReplies.editTitle')
              : t('settings.autoReplies.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <form
          id="ar-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Field>
            <FieldLabel htmlFor="ar-name">
              {t('settings.autoReplies.fields.name')}
            </FieldLabel>
            <Input
              id="ar-name"
              value={form.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder={t('settings.autoReplies.placeholders.name')}
              maxLength={120}
              disabled={isPending}
            />
            {fieldErrors.name && (
              <FieldError>
                {t(
                  fieldErrors.name === 'tooLong'
                    ? 'settings.autoReplies.errors.nameTooLong'
                    : 'settings.autoReplies.errors.nameRequired',
                )}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="ar-keywords">
              {t('settings.autoReplies.fields.keywords')}
            </FieldLabel>
            <Input
              id="ar-keywords"
              value={form.keywords}
              onChange={(e) => onFieldChange('keywords', e.target.value)}
              placeholder={t('settings.autoReplies.placeholders.keywords')}
              disabled={isPending}
            />
            {fieldErrors.keywords && (
              <FieldError>
                {t('settings.autoReplies.errors.keywordsRequired')}
              </FieldError>
            )}
            <p className="text-muted-foreground text-xs">
              {t('settings.autoReplies.keywordsHint')}
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="ar-match-type">
              {t('settings.autoReplies.fields.matchType')}
            </FieldLabel>
            <Select
              value={form.matchType}
              onValueChange={(v) =>
                onFieldChange('matchType', v as AutoReplyMatchType)
              }
              disabled={isPending}
            >
              <SelectTrigger id="ar-match-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">
                  {t('settings.autoReplies.matchTypes.exact')}
                </SelectItem>
                <SelectItem value="contains">
                  {t('settings.autoReplies.matchTypes.contains')}
                </SelectItem>
                <SelectItem value="starts_with">
                  {t('settings.autoReplies.matchTypes.starts_with')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="ar-reply-type">
              {t('settings.autoReplies.fields.replyType')}
            </FieldLabel>
            <Select
              value={form.replyType}
              onValueChange={(v) =>
                onFieldChange('replyType', v as AutoReplyType)
              }
              disabled={isPending}
            >
              <SelectTrigger id="ar-reply-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  {t('settings.autoReplies.replyTypes.text')}
                </SelectItem>
                <SelectItem value="template">
                  {t('settings.autoReplies.replyTypes.template')}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.replyType === 'text' ? (
            <Field>
              <FieldLabel htmlFor="ar-reply-text">
                {t('settings.autoReplies.fields.replyText')}
              </FieldLabel>
              <Textarea
                id="ar-reply-text"
                rows={4}
                value={form.replyText}
                onChange={(e) => onFieldChange('replyText', e.target.value)}
                placeholder={t('settings.autoReplies.placeholders.replyText')}
                disabled={isPending}
              />
              {fieldErrors.replyText && (
                <FieldError>
                  {t('settings.autoReplies.errors.replyTextRequired')}
                </FieldError>
              )}
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="ar-reply-template">
                {t('settings.autoReplies.fields.replyTemplateName')}
              </FieldLabel>
              <Select
                value={form.replyTemplateName || undefined}
                onValueChange={(v) => onFieldChange('replyTemplateName', v)}
                disabled={isPending || templates.length === 0}
              >
                <SelectTrigger id="ar-reply-template">
                  <SelectValue
                    placeholder={
                      templates.length === 0
                        ? t('settings.autoReplies.noTemplates')
                        : undefined
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.name}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.replyTemplateName && (
                <FieldError>
                  {t('settings.autoReplies.errors.replyTemplateRequired')}
                </FieldError>
              )}
            </Field>
          )}

          {form.replyType === 'template' && (
            <Field>
              <FieldLabel htmlFor="ar-reply-template-language">
                {t('settings.autoReplies.fields.replyTemplateLanguage')}
              </FieldLabel>
              <Select
                value={form.replyTemplateLanguage}
                onValueChange={(v) => onFieldChange('replyTemplateLanguage', v)}
                disabled={isPending}
              >
                <SelectTrigger id="ar-reply-template-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.replyTemplateLanguage && (
                <FieldError>
                  {t(
                    'settings.autoReplies.errors.replyTemplateLanguageRequired',
                  )}
                </FieldError>
              )}
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="ar-priority">
              {t('settings.autoReplies.fields.priority')}
            </FieldLabel>
            <Input
              id="ar-priority"
              type="number"
              min={0}
              step={1}
              value={form.priority}
              onChange={(e) => onFieldChange('priority', e.target.value)}
              placeholder={t('settings.autoReplies.placeholders.priority')}
              disabled={isPending}
            />
            {fieldErrors.priority && (
              <FieldError>
                {t('settings.autoReplies.errors.priorityInvalid')}
              </FieldError>
            )}
          </Field>

          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor="ar-active">
              {t('settings.autoReplies.fields.active')}
            </FieldLabel>
            <Switch
              id="ar-active"
              checked={form.isActive}
              onCheckedChange={(v) => onFieldChange('isActive', v)}
              disabled={isPending}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="ar-form" disabled={isPending}>
            {isPending && <Spinner className="mr-2 size-4" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AutoRepliesSectionProps {
  slug: string;
  canWrite: boolean;
}

function AutoRepliesSection({ slug, canWrite }: AutoRepliesSectionProps) {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const enabled = hasFeature(ws, 'keyword_autoreplies');

  const { data: rules, isLoading, isError } = useAutoReplyRules(slug);
  const { data: tplData } = useTemplates(slug);
  const updateRule = useUpdateAutoReplyRule(slug);
  const deleteRule = useDeleteAutoReplyRule(slug);

  const approvedTemplates = useMemo(
    () => (tplData?.templates ?? []).filter((tpl) => tpl.status === 'APPROVED'),
    [tplData],
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WaAutoReplyRule | null>(null);
  const [deleting, setDeleting] = useState<WaAutoReplyRule | null>(null);

  return (
    <section className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">
              {t('settings.autoReplies.title')}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('settings.autoReplies.subtitle')}
            </p>
          </div>
          {canWrite && (
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              disabled={!enabled}
            >
              <Plus className="mr-1.5 size-4" />
              {t('settings.autoReplies.addCta')}
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {!enabled && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800/40 dark:bg-amber-950/20">
            <Lock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="flex-1 text-amber-800 dark:text-amber-300">
              {t('settings.autoReplies.upgradeBanner')}
            </p>
            <InfoTip content={t('workspace.plan.upgradeSoon')}>
              <Button size="sm" variant="outline" disabled>
                {t('settings.autoReplies.upgrade')}
              </Button>
            </InfoTip>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-muted-foreground text-sm">
            {t('settings.autoReplies.loadError')}
          </p>
        ) : !rules || rules.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <p className="font-medium">
              {t('settings.autoReplies.emptyTitle')}
            </p>
            <p className="text-muted-foreground text-sm">
              {t('settings.autoReplies.emptyBody')}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('settings.autoReplies.cols.keywords')}
                  </TableHead>
                  <TableHead>
                    {t('settings.autoReplies.cols.matchType')}
                  </TableHead>
                  <TableHead>{t('settings.autoReplies.cols.reply')}</TableHead>
                  <TableHead className="w-20">
                    {t('settings.autoReplies.cols.priority')}
                  </TableHead>
                  <TableHead className="w-16">
                    {t('settings.autoReplies.cols.active')}
                  </TableHead>
                  {canWrite && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rule.keywords.map((kw) => (
                          <code
                            key={kw}
                            className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono"
                          >
                            {kw}
                          </code>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`settings.autoReplies.matchTypes.${rule.matchType}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {rule.replyType === 'text'
                        ? rule.replyText
                        : t('settings.autoReplies.templateLabel', {
                            name: rule.replyTemplateName,
                          })}
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(v) =>
                          updateRule.mutate(
                            { id: rule.id, body: { isActive: v } },
                            { onError: (err) => toast.error(err) },
                          )
                        }
                        disabled={!canWrite || !enabled || updateRule.isPending}
                        aria-label={t('settings.autoReplies.fields.active')}
                      />
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('settings.autoReplies.actions')}
                              disabled={!enabled}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(rule)}>
                              {t('settings.autoReplies.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(rule)}
                            >
                              {t('settings.autoReplies.delete')}
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

        {!canWrite && rules && rules.length > 0 && (
          <p className="text-muted-foreground mt-3 text-xs">
            {t('settings.autoReplies.readOnlyNotice')}
          </p>
        )}
      </div>

      <AutoReplyRuleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        slug={slug}
        templates={approvedTemplates}
      />

      {editing && (
        <AutoReplyRuleDialog
          key={editing.id}
          open={Boolean(editing)}
          onOpenChange={(o) => !o && setEditing(null)}
          initial={editing}
          slug={slug}
          templates={approvedTemplates}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.autoReplies.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.autoReplies.deleteBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteRule.mutate(deleting.id, {
                  onSuccess: () =>
                    toast.success(t('settings.autoReplies.deleted')),
                  onError: (err) => toast.error(err),
                });
                setDeleting(null);
              }}
            >
              {t('settings.autoReplies.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

      {/* Auto-replies */}
      <AutoRepliesSection slug={ws.slug} canWrite={canWrite} />

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

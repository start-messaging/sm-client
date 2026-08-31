import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Lock, MoreHorizontal, Plus, Slash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/api/hooks/use-api-keys';
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
import { hasCapability, hasFeature } from '@/lib/plan';
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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[13px] font-semibold text-[#18181b]">
          {t('settings.routing.title')}
        </h2>
        <p className="text-[12px] text-[#71717a] mt-0.5">
          {t('settings.routing.subtitle')}
        </p>
      </div>

      <div className="rounded-[10px] border border-[#e4e4e7] divide-y divide-[#e4e4e7]">
        {isAdmin && (
          <div className="flex items-start justify-between gap-4 px-4 py-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#18181b]">
                {t('settings.routing.roundRobin.label')}
              </p>
              <p className="text-[12px] text-[#71717a] mt-0.5">
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
        <div className="flex items-start justify-between gap-4 px-4 py-4">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#18181b]">
              {t('settings.routing.available.label')}
            </p>
            <p className="text-[12px] text-[#71717a] mt-0.5">
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
        <div className="bg-[#fafafa] rounded-b-[10px] px-4 py-3">
          <p className="text-[11px] text-[#a1a1aa]">
            {t('settings.routing.education')}
          </p>
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[#18181b]">
            {t('settings.autoReplies.title')}
          </h2>
          <p className="text-[12px] text-[#71717a] mt-0.5">
            {t('settings.autoReplies.subtitle')}
          </p>
        </div>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={!enabled}
          >
            <Plus className="mr-1.5 size-3.5" />
            {t('settings.autoReplies.addCta')}
          </Button>
        )}
      </div>

      {!enabled && (
        <div className="flex items-center gap-2 rounded-[8px] border border-[#fcd34d] bg-[#fef9c3] px-3 py-2">
          <Lock className="size-3.5 shrink-0 text-[#d97706]" />
          <p className="flex-1 text-[12px] text-[#92400e]">
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
        <p className="text-[13px] text-[#71717a]">
          {t('settings.autoReplies.loadError')}
        </p>
      ) : !rules || rules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-[#e4e4e7] py-12 text-center">
          <p className="text-[13px] font-medium text-[#18181b]">
            {t('settings.autoReplies.emptyTitle')}
          </p>
          <p className="text-[12px] text-[#71717a]">
            {t('settings.autoReplies.emptyBody')}
          </p>
        </div>
      ) : (
        <div className="rounded-[10px] border border-[#e4e4e7] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#fafafa]">
                <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                  {t('settings.autoReplies.cols.keywords')}
                </TableHead>
                <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                  {t('settings.autoReplies.cols.matchType')}
                </TableHead>
                <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                  {t('settings.autoReplies.cols.reply')}
                </TableHead>
                <TableHead className="w-20 text-[11px] font-medium text-[#a1a1aa]">
                  {t('settings.autoReplies.cols.priority')}
                </TableHead>
                <TableHead className="w-16 text-[11px] font-medium text-[#a1a1aa]">
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
                        <span
                          key={kw}
                          className="bg-[#f4f4f5] text-[#18181b] text-[11px] font-mono font-medium px-[6px] py-px rounded-full"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="border border-[#e4e4e7] text-[#71717a] text-[10px] px-[6px] py-px rounded-full">
                      {t(`settings.autoReplies.matchTypes.${rule.matchType}`)}
                    </span>
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
        <p className="text-[11px] text-[#a1a1aa]">
          {t('settings.autoReplies.readOnlyNotice')}
        </p>
      )}

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
    </div>
  );
}

/* ------------------------------------------------------------------ quick replies panel */

function QuickRepliesPanel({
  slug,
  canWrite,
}: {
  slug: string;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const { data: replies, isLoading, isError } = useQuickReplies(slug);
  const deleteReply = useDeleteQuickReply(slug);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [deleting, setDeleting] = useState<QuickReply | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[#18181b]">
            {t('settings.quickReplies.title', 'Quick replies')}
          </h2>
          <p className="text-[12px] text-[#71717a] mt-0.5">
            {t('settings.quickReplies.educationBody')}
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            {t('settings.quickReplies.addCta')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-[13px] text-[#71717a]">
          {t('settings.quickReplies.loadError')}
        </p>
      ) : !replies || replies.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[10px] border border-dashed border-[#e4e4e7] py-16 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f5]">
            <Slash className="size-5 text-[#a1a1aa]" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#18181b]">
              {t('settings.quickReplies.emptyTitle')}
            </p>
            <p className="text-[12px] text-[#71717a] mt-0.5">
              {t('settings.quickReplies.emptyBody')}
            </p>
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              {t('settings.quickReplies.addCta')}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-[10px] border border-[#e4e4e7] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#fafafa]">
                <TableHead className="w-32 text-[11px] font-medium text-[#a1a1aa]">
                  {t('settings.quickReplies.cols.shortcut')}
                </TableHead>
                <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                  {t('settings.quickReplies.cols.title')}
                </TableHead>
                <TableHead className="hidden md:table-cell text-[11px] font-medium text-[#a1a1aa]">
                  {t('settings.quickReplies.cols.body')}
                </TableHead>
                {canWrite && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {replies.map((qr) => (
                <TableRow key={qr.id}>
                  <TableCell>
                    <span className="bg-[#f4f4f5] text-[#18181b] text-[11px] font-mono font-medium px-[6px] py-px rounded-full">
                      /{qr.shortcut}
                    </span>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-[#18181b]">
                    {qr.title}
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate md:table-cell text-[12px] text-[#71717a]">
                    {qr.body}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-[#a1a1aa] hover:text-[#18181b]"
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

      {!canWrite && replies && replies.length > 0 && (
        <p className="text-[11px] text-[#a1a1aa]">
          {t('settings.quickReplies.readOnlyNotice')}
        </p>
      )}

      <QuickReplyDialog open={addOpen} onOpenChange={setAddOpen} slug={slug} />
      {editing && (
        <QuickReplyDialog
          key={editing.id}
          open={Boolean(editing)}
          onOpenChange={(o) => !o && setEditing(null)}
          initial={editing}
          slug={slug}
        />
      )}
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

/* ------------------------------------------------------------------ api keys */

type ApiKeyDialogState = 'closed' | 'form' | 'reveal';

function ApiKeysSection({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const enabled = hasFeature(ws, 'api_triggers');

  const { data, isLoading, isError } = useApiKeys(slug);
  const createKey = useCreateApiKey(slug);
  const revokeKey = useRevokeApiKey(slug);

  const [dialogState, setDialogState] = useState<ApiKeyDialogState>('closed');
  const [keyName, setKeyName] = useState('');
  const [nameError, setNameError] = useState('');
  const [rawKey, setRawKey] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const keys = data?.apiKeys ?? [];

  function openGenerate() {
    setKeyName('');
    setNameError('');
    setDialogState('form');
  }

  function closeDialog() {
    setDialogState('closed');
    setRawKey('');
    setKeyName('');
    setNameError('');
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = keyName.trim();
    if (!trimmed) {
      setNameError('required');
      return;
    }
    if (trimmed.length > 80) {
      setNameError('tooLong');
      return;
    }
    createKey.mutate(
      { name: trimmed },
      {
        onSuccess: (result) => {
          setRawKey(result.rawKey);
          setDialogState('reveal');
        },
        onError: (err) => toast.error(err),
      },
    );
  }

  function formatLastUsed(dateStr: string | null) {
    if (!dateStr) return t('api_keys.never_used');
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[#18181b]">
            {t('api_keys.page_title')}
          </h2>
        </div>
        {enabled && (
          <Button size="sm" onClick={openGenerate}>
            <Plus className="mr-1.5 size-3.5" />
            {t('api_keys.generate')}
          </Button>
        )}
      </div>

      {!enabled && (
        <div className="flex items-center gap-2 rounded-[8px] border border-[#fcd34d] bg-[#fef9c3] px-3 py-2">
          <Lock className="size-3.5 shrink-0 text-[#d97706]" />
          <p className="flex-1 text-[12px] text-[#92400e]">
            {t('api_keys.plan_gate')}
          </p>
          <InfoTip content={t('workspace.plan.upgradeSoon')}>
            <Button size="sm" variant="outline" disabled>
              {t('workspace.plan.upgrade')}
            </Button>
          </InfoTip>
        </div>
      )}

      {enabled &&
        (isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-[13px] text-[#71717a]">
            {t('settings.quickReplies.loadError')}
          </p>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-[#e4e4e7] py-12 text-center">
            <p className="text-[13px] font-medium text-[#18181b]">
              {t('api_keys.empty_title')}
            </p>
            <p className="text-[12px] text-[#71717a]">
              {t('api_keys.empty_desc')}
            </p>
            <Button size="sm" onClick={openGenerate}>
              <Plus className="mr-1.5 size-3.5" />
              {t('api_keys.generate')}
            </Button>
          </div>
        ) : (
          <div className="rounded-[10px] border border-[#e4e4e7] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#fafafa]">
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('settings.autoReplies.fields.name')}
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('api_keys.prefix_label')}
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('api_keys.last_used')}
                  </TableHead>
                  <TableHead className="w-28 text-[11px] font-medium text-[#a1a1aa]">
                    {t('settings.quickReplies.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => {
                  const isRevoked = key.revokedAt !== null;
                  return (
                    <TableRow
                      key={key.id}
                      className={isRevoked ? 'opacity-50' : undefined}
                    >
                      <TableCell
                        className={cn(
                          'text-[13px] font-medium text-[#18181b]',
                          isRevoked && 'line-through',
                        )}
                      >
                        {key.name}
                      </TableCell>
                      <TableCell>
                        <span className="bg-[#f4f4f5] text-[#18181b] text-[11px] font-mono font-medium px-[6px] py-px rounded-full">
                          {key.keyPrefix}
                          {'••••••••'}
                        </span>
                      </TableCell>
                      <TableCell className="text-[12px] text-[#71717a]">
                        {formatLastUsed(key.lastUsedAt)}
                      </TableCell>
                      <TableCell>
                        {isRevoked ? (
                          <span className="text-[12px] text-[#a1a1aa]">
                            Revoked
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRevokingId(key.id)}
                            disabled={revokeKey.isPending}
                          >
                            {t('api_keys.revoke')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))}

      <Dialog
        open={dialogState !== 'closed'}
        onOpenChange={(o) => !o && closeDialog()}
      >
        <DialogContent className="max-w-md">
          {dialogState === 'form' ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('api_keys.generate')}</DialogTitle>
              </DialogHeader>
              <form
                id="ak-form"
                onSubmit={handleGenerate}
                className="flex flex-col gap-4"
              >
                <Field>
                  <FieldLabel htmlFor="ak-name">
                    {t('api_keys.name_label')}
                  </FieldLabel>
                  <Input
                    id="ak-name"
                    value={keyName}
                    onChange={(e) => {
                      setKeyName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    maxLength={80}
                    placeholder="e.g. My integration"
                    disabled={createKey.isPending}
                  />
                  {nameError && (
                    <FieldError>
                      {nameError === 'tooLong'
                        ? 'Name must be 80 characters or fewer'
                        : 'Name is required'}
                    </FieldError>
                  )}
                </Field>
              </form>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={closeDialog}
                  disabled={createKey.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="ak-form"
                  disabled={createKey.isPending}
                >
                  {createKey.isPending && <Spinner className="mr-2 size-4" />}
                  Generate
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('api_keys.generate')}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription className="text-[12px] text-amber-800">
                    {t('api_keys.save_warning')}
                  </AlertDescription>
                </Alert>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-[6px] border border-[#e4e4e7] bg-[#f4f4f5] px-3 py-2 text-[12px] font-mono text-[#18181b]">
                    {rawKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      void navigator.clipboard.writeText(rawKey);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeDialog}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={revokingId !== null}
        onOpenChange={(o) => !o && setRevokingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to revoke this key?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The key will stop working
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!revokingId) return;
                revokeKey.mutate(revokingId, {
                  onSuccess: () => toast.success('API key revoked'),
                  onError: (err) => toast.error(err),
                });
                setRevokingId(null);
              }}
            >
              {t('api_keys.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

type SettingsSection = 'general' | 'inbox' | 'autoreplies' | 'apikeys';

const NAV_ITEMS: { id: SettingsSection; labelKey: string }[] = [
  { id: 'general', labelKey: 'settings.nav.general' },
  { id: 'inbox', labelKey: 'settings.nav.inbox' },
  { id: 'autoreplies', labelKey: 'settings.nav.autoreplies' },
  { id: 'apikeys', labelKey: 'api_keys.page_title' },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const myRank = ROLE_RANK[ws.role];
  const canWrite = hasCapability(ws, 'write_settings');
  const isAgent = myRank >= ROLE_RANK[WorkspaceRole.AGENT];

  const [section, setSection] = useState<SettingsSection>('general');

  return (
    <div className="flex min-h-0 flex-1 gap-8">
      {/* Left sub-nav */}
      <nav className="w-40 shrink-0">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-[6px] text-[13px] transition-colors',
                  section === item.id
                    ? 'bg-[#f4f4f5] font-medium text-[#18181b]'
                    : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f9f9f9]',
                )}
              >
                {t(item.labelKey, item.id)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {section === 'general' && (
          <QuickRepliesPanel slug={ws.slug} canWrite={canWrite} />
        )}
        {section === 'inbox' && isAgent && (
          <RoutingCard slug={ws.slug} isAdmin={canWrite} />
        )}
        {section === 'inbox' && !isAgent && (
          <p className="text-[13px] text-[#71717a]">
            {t(
              'settings.routing.agentOnly',
              'Inbox settings are available to agents and above.',
            )}
          </p>
        )}
        {section === 'autoreplies' && (
          <AutoRepliesSection slug={ws.slug} canWrite={canWrite} />
        )}
        {section === 'apikeys' && <ApiKeysSection slug={ws.slug} />}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useCreateTemplate } from '@/api/hooks/use-templates';
import { toast } from '@/lib/toast';
import type {
  TemplateCategory,
  TemplateComponent,
  TemplateButton,
  WaTemplate,
} from '@/api/templates.api';
import type { TemplateExample } from '@/lib/template-examples';
import { WaMessagePreview } from '@/components/whatsapp/wa-message-preview';
import { TemplateEditorButtons } from './template-editor-buttons';

const TEMPLATE_NAME_RE = /^[a-z0-9_]{1,512}$/;

type TemplateSubtype = 'standard' | 'lto' | 'authentication' | 'carousel';

const SUBTYPES: { value: TemplateSubtype; labelKey: string }[] = [
  { value: 'standard', labelKey: 'templates.subtype_standard' },
  { value: 'lto', labelKey: 'templates.subtype_lto' },
  { value: 'authentication', labelKey: 'templates.subtype_authentication' },
  { value: 'carousel', labelKey: 'templates.subtype_carousel' },
];

const CAROUSEL_BUTTON_TYPES: {
  value: TemplateButton['type'];
  label: string;
}[] = [
  { value: 'QUICK_REPLY', label: 'Quick reply' },
  { value: 'URL', label: 'Visit website (URL)' },
  { value: 'PHONE_NUMBER', label: 'Call phone number' },
];

const LANGUAGES = [
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

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'UTILITY', label: 'Utility' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'AUTHENTICATION', label: 'Authentication' },
];

const HEADER_FORMATS: NonNullable<TemplateComponent['format']>[] = [
  'TEXT',
  'IMAGE',
  'VIDEO',
  'DOCUMENT',
];

const AUTH_BODY =
  'Your verification code is {{1}}. Do not share it with anyone.';

const schema = z
  .object({
    name: z.string().regex(TEMPLATE_NAME_RE, 'templates.create.nameInvalid'),
    language: z.string().min(2),
    category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
    bodyText: z.string().min(1, 'templates.create.bodyRequired').max(1024),
    headerFormat: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']),
    headerText: z.string().max(60).optional(),
    headerLink: z.string().max(2048).optional(),
    footerText: z.string().max(60).optional(),
  })
  .refine((v) => v.headerFormat === 'TEXT' || !!v.headerLink?.trim(), {
    message: 'templates.create.headerLinkRequired',
    path: ['headerLink'],
  });
type FormValues = z.infer<typeof schema>;

export interface CreateTemplateSeed {
  name: string;
  language: string;
  category: TemplateCategory;
  bodyText: string;
  bodySamples?: string[];
  headerFormat?: TemplateComponent['format'];
  headerText?: string;
  headerLink?: string;
  footerText?: string;
  buttons?: TemplateButton[];
  banner?: 'copyApproved' | 'resubmitRejected';
}

function bodyVariableIndexes(text: string): number[] {
  const matches = [...text.matchAll(/\{\{([0-9]+)\}\}/g)];
  const indexes = matches.map((m) => Number(m[1]));
  return Array.from(new Set(indexes)).sort((a, b) => a - b);
}

function substituteBodyVariables(
  text: string,
  samples: Record<number, string>,
): string {
  return text.replace(/\{\{([0-9]+)\}\}/g, (match, n) => {
    const sample = samples[Number(n)]?.trim();
    return sample || match;
  });
}

function buttonsFromComponents(
  components: TemplateComponent[],
): TemplateButton[] {
  return components.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
}

function seedFromComponents(
  components: TemplateComponent[],
): Pick<
  CreateTemplateSeed,
  | 'bodyText'
  | 'bodySamples'
  | 'headerFormat'
  | 'headerText'
  | 'headerLink'
  | 'footerText'
  | 'buttons'
> {
  const header = components.find((c) => c.type === 'HEADER');
  const body = components.find((c) => c.type === 'BODY');
  return {
    bodyText: body?.text ?? '',
    bodySamples: body?.example?.body_text?.[0],
    headerFormat: header?.format,
    headerText: header?.text,
    headerLink: header?.link,
    footerText: components.find((c) => c.type === 'FOOTER')?.text,
    buttons: buttonsFromComponents(components),
  };
}

export function seedFromExample(example: TemplateExample): CreateTemplateSeed {
  return {
    name: example.suggestedName,
    language: example.language,
    category: example.category,
    ...seedFromComponents(example.components),
  };
}

export function seedFromTemplate(
  tpl: WaTemplate,
  opts?: { asNewVersion?: boolean },
): CreateTemplateSeed {
  const name = opts?.asNewVersion ? `${tpl.name}_v2`.slice(0, 512) : tpl.name;
  return {
    name,
    language: tpl.language,
    category: tpl.category,
    ...seedFromComponents(tpl.components),
    banner: opts?.asNewVersion ? 'copyApproved' : 'resubmitRejected',
  };
}

interface TemplateEditorFormProps {
  slug: string;
  seed?: CreateTemplateSeed | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function TemplateEditorForm({
  slug,
  seed,
  onCancel,
  onSuccess,
}: TemplateEditorFormProps) {
  const { t } = useTranslation();

  const [subtype, setSubtype] = useState<TemplateSubtype>('standard');
  const [buttons, setButtons] = useState<TemplateButton[]>(seed?.buttons ?? []);
  const [buttonErrors, setButtonErrors] = useState<string[]>([]);
  const [bodySamples, setBodySamples] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    seed?.bodySamples?.forEach((v, i) => {
      init[i + 1] = v;
    });
    return init;
  });
  const [bodySampleError, setBodySampleError] = useState('');

  // LTO state
  const [ltoHasExpiry, setLtoHasExpiry] = useState(false);

  // Authentication state
  const [authCopyCode, setAuthCopyCode] = useState(true);
  const [authExpiryMinutes, setAuthExpiryMinutes] = useState('');

  // Carousel state
  const [carouselHeaderFormat, setCarouselHeaderFormat] = useState<
    'IMAGE' | 'VIDEO'
  >('IMAGE');
  const [carouselCardCount, setCarouselCardCount] = useState(2);
  const [carouselButtonType, setCarouselButtonType] =
    useState<TemplateButton['type']>('QUICK_REPLY');

  const createTemplate = useCreateTemplate(slug);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: seed?.name ?? '',
      language: seed?.language ?? 'en_US',
      category: seed?.category ?? 'UTILITY',
      bodyText: seed?.bodyText ?? '',
      headerFormat: seed?.headerFormat ?? 'TEXT',
      headerText: seed?.headerText ?? '',
      headerLink: seed?.headerLink ?? '',
      footerText: seed?.footerText ?? '',
    },
  });

  const language = useWatch({ control, name: 'language' });
  const category = useWatch({ control, name: 'category' });
  const name = useWatch({ control, name: 'name' });
  const bodyText = useWatch({ control, name: 'bodyText' });
  const headerFormat = useWatch({ control, name: 'headerFormat' });
  const headerText = useWatch({ control, name: 'headerText' });
  const footerText = useWatch({ control, name: 'footerText' });

  const bodyVariables = useMemo(
    () =>
      bodyVariableIndexes(
        subtype === 'authentication' ? AUTH_BODY : (bodyText ?? ''),
      ),
    [bodyText, subtype],
  );

  const previewBodyText = useMemo(() => {
    if (subtype === 'authentication') return AUTH_BODY;
    return substituteBodyVariables(bodyText ?? '', bodySamples);
  }, [bodyText, bodySamples, subtype]);

  const previewHeaderText = headerFormat === 'TEXT' ? headerText : undefined;

  function updateBodySample(index: number, value: string) {
    setBodySamples((prev) => ({ ...prev, [index]: value }));
    setBodySampleError('');
  }

  function validateButtons(): string[] {
    const urlCount = buttons.filter((b) => b.type === 'URL').length;
    const phoneCount = buttons.filter((b) => b.type === 'PHONE_NUMBER').length;
    let seenUrl = 0;
    let seenPhone = 0;
    return buttons.map((b) => {
      if (!b.text.trim())
        return t(
          'templates.create.buttons.errorText',
          'Button label is required',
        );
      if (b.type === 'URL') {
        seenUrl += 1;
        if (urlCount > 2 && seenUrl > 2)
          return t(
            'templates.create.buttons.errorUrlMax',
            'Meta allows at most 2 website buttons',
          );
        if (!b.url?.trim())
          return t('templates.create.buttons.errorUrl', 'URL is required');
      }
      if (b.type === 'PHONE_NUMBER') {
        seenPhone += 1;
        if (phoneCount > 1 && seenPhone > 1)
          return t(
            'templates.create.buttons.errorPhoneMax',
            'Meta allows only one call button',
          );
        if (!b.phone_number?.trim())
          return t(
            'templates.create.buttons.errorPhone',
            'Phone number is required',
          );
      }
      return '';
    });
  }

  const onSubmit = (v: FormValues) => {
    const showButtons = subtype !== 'authentication' && subtype !== 'carousel';

    if (showButtons) {
      const errs = validateButtons();
      if (errs.some(Boolean)) {
        setButtonErrors(errs);
        return;
      }
    }

    if (subtype !== 'authentication') {
      const missingSample = bodyVariables.some((n) => !bodySamples[n]?.trim());
      if (missingSample) {
        setBodySampleError(
          t(
            'templates.create.sampleRequired',
            'A sample value is required for every {{n}} variable in the body',
          ),
        );
        return;
      }
    }

    const components: TemplateComponent[] = [];

    if (subtype === 'carousel') {
      components.push({
        type: 'HEADER',
        format: carouselHeaderFormat,
      });
    } else if (v.headerFormat === 'TEXT') {
      if (v.headerText?.trim()) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: v.headerText.trim(),
        });
      }
    } else {
      components.push({
        type: 'HEADER',
        format: v.headerFormat,
        link: v.headerLink?.trim(),
      });
    }

    if (subtype === 'authentication') {
      components.push({ type: 'BODY', text: AUTH_BODY });
    } else {
      const bodyComponent: TemplateComponent = {
        type: 'BODY',
        text: v.bodyText,
      };
      if (bodyVariables.length > 0) {
        bodyComponent.example = {
          body_text: [bodyVariables.map((n) => bodySamples[n]?.trim() ?? '')],
        };
      }
      components.push(bodyComponent);
    }

    if (
      subtype !== 'authentication' &&
      subtype !== 'carousel' &&
      v.footerText?.trim()
    ) {
      components.push({ type: 'FOOTER', text: v.footerText.trim() });
    }

    if (subtype === 'authentication' && authCopyCode) {
      components.push({
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: t('templates.auth_copy_code', 'Copy code'),
          },
        ],
      });
    } else if (showButtons && buttons.length > 0) {
      const callToAction = buttons.filter((b) => b.type !== 'QUICK_REPLY');
      const quickReplies = buttons.filter((b) => b.type === 'QUICK_REPLY');
      components.push({
        type: 'BUTTONS',
        buttons: [...callToAction, ...quickReplies],
      });
    }

    const extraFields =
      subtype === 'carousel'
        ? {
            subtype: 'carousel' as const,
            carouselCardCount,
            carouselHeaderFormat,
            carouselButtonType,
          }
        : subtype === 'lto'
          ? { subtype: 'lto' as const, ltoHasExpiry }
          : subtype === 'authentication'
            ? {
                subtype: 'authentication' as const,
                authCopyCode,
                authExpiryMinutes: authExpiryMinutes
                  ? Number(authExpiryMinutes)
                  : undefined,
              }
            : { subtype: 'standard' as const };

    createTemplate.mutate(
      {
        name: v.name,
        language: v.language,
        category: v.category,
        components,
        ...extraFields,
      } as Parameters<typeof createTemplate.mutate>[0],
      {
        onSuccess: () => {
          toast.success(t('templates.create.success'));
          onSuccess();
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const previewButtonLabels = useMemo(() => {
    if (subtype === 'authentication') {
      return authCopyCode ? [t('templates.auth_copy_code', 'Copy code')] : [];
    }
    if (subtype === 'carousel') return [];
    return buttons.map((b) => b.text.trim()).filter(Boolean);
  }, [subtype, buttons, authCopyCode, t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex min-w-0 flex-1 flex-col gap-4"
      >
        {seed?.banner === 'copyApproved' && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {t('templates.editor.copyApproved')}
          </p>
        )}
        {seed?.banner === 'resubmitRejected' && (
          <p className="text-muted-foreground text-sm">
            {t('templates.editor.resubmitRejected')}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="tpl-name">
            {t('templates.create.name')}
          </FieldLabel>
          <Input
            id="tpl-name"
            placeholder="order_confirmation"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <p className="text-muted-foreground text-xs">
            {t('templates.create.nameHint')}
          </p>
          {errors.name && (
            <FieldError errors={[{ message: t(errors.name.message!) }]} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="tpl-lang">
              {t('templates.create.language')}
            </FieldLabel>
            <Select
              value={language}
              onValueChange={(v) => setValue('language', v)}
            >
              <SelectTrigger id="tpl-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="tpl-category">
              {t('templates.create.category')}
            </FieldLabel>
            <Select
              value={category}
              onValueChange={(v) => setValue('category', v as TemplateCategory)}
            >
              <SelectTrigger id="tpl-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subtype selector */}
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="tpl-subtype">
            {t('templates.subtype_label')}
          </FieldLabel>
          <Select
            value={subtype}
            onValueChange={(v) => setSubtype(v as TemplateSubtype)}
          >
            <SelectTrigger id="tpl-subtype">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBTYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Header — hidden for carousel (header format is set via carousel controls) */}
        {subtype !== 'carousel' && (
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="tpl-header-format">
              {t('templates.create.headerOptional')}
            </FieldLabel>
            <Select
              value={headerFormat}
              onValueChange={(v) =>
                setValue('headerFormat', v as FormValues['headerFormat'])
              }
            >
              <SelectTrigger id="tpl-header-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADER_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {t(`templates.create.headerFormat.${f}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {headerFormat === 'TEXT' ? (
              <Input
                id="tpl-header"
                placeholder={t('templates.create.headerPlaceholder')}
                maxLength={60}
                {...register('headerText')}
              />
            ) : (
              <>
                <Input
                  id="tpl-header-link"
                  placeholder="https://cdn.example.com/banner.jpg"
                  aria-invalid={!!errors.headerLink}
                  {...register('headerLink')}
                />
                <p className="text-muted-foreground text-xs">
                  {t('templates.create.headerLinkHint')}
                </p>
                {errors.headerLink && (
                  <FieldError
                    errors={[{ message: t(errors.headerLink.message!) }]}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Body — read-only for authentication */}
        {subtype === 'authentication' ? (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('templates.create.body')}</FieldLabel>
            <div className="bg-muted/30 rounded-md border px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
              {AUTH_BODY}
            </div>
            <p className="text-muted-foreground text-xs">
              {t('templates.auth_body_preview', AUTH_BODY)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="tpl-body">
              {t('templates.create.body')}
            </FieldLabel>
            <Textarea
              id="tpl-body"
              rows={5}
              placeholder={t('templates.create.bodyPlaceholder')}
              aria-invalid={!!errors.bodyText}
              {...register('bodyText')}
            />
            <p className="text-muted-foreground text-xs">
              {t('templates.create.bodyHint')}
            </p>
            {errors.bodyText && (
              <FieldError errors={[{ message: t(errors.bodyText.message!) }]} />
            )}

            {bodyVariables.length > 0 && (
              <div className="bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
                <p className="text-xs font-semibold">
                  {t('templates.create.sampleValuesTitle')}
                </p>
                {bodyVariables.map((n) => (
                  <div key={n} className="flex flex-col gap-1">
                    <FieldLabel htmlFor={`tpl-sample-${n}`} className="text-xs">
                      {t('templates.create.sampleFor', 'Sample for {{n}}', {
                        n: `{{${n}}}`,
                      })}
                    </FieldLabel>
                    <Input
                      id={`tpl-sample-${n}`}
                      className="h-8 text-xs"
                      value={bodySamples[n] ?? ''}
                      onChange={(e) => updateBodySample(n, e.target.value)}
                    />
                  </div>
                ))}
                <p className="text-muted-foreground text-xs">
                  {t('templates.create.sampleHint')}
                </p>
                {bodySampleError && (
                  <FieldError errors={[{ message: bodySampleError }]} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer — hidden for auth and carousel */}
        {subtype !== 'authentication' && subtype !== 'carousel' && (
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="tpl-footer">
              {t('templates.create.footerOptional')}
            </FieldLabel>
            <Input
              id="tpl-footer"
              placeholder={t('templates.create.footerPlaceholder')}
              maxLength={60}
              {...register('footerText')}
            />
          </div>
        )}

        {/* LTO fields */}
        {subtype === 'lto' && (
          <div className="bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={ltoHasExpiry}
                onChange={(e) => setLtoHasExpiry(e.target.checked)}
              />
              {t('templates.lto_expiry_toggle')}
            </label>
            <p className="text-muted-foreground text-xs">
              {t('templates.lto_expiry_hint')}
            </p>
          </div>
        )}

        {/* Authentication fields */}
        {subtype === 'authentication' && (
          <div className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={authCopyCode}
                onChange={(e) => setAuthCopyCode(e.target.checked)}
              />
              {t('templates.auth_copy_code')}
            </label>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="auth-expiry" className="text-xs">
                {t('templates.auth_expiry_minutes')}
              </FieldLabel>
              <Input
                id="auth-expiry"
                type="number"
                min={1}
                max={90}
                className="h-8 w-24 text-xs"
                placeholder="e.g. 10"
                value={authExpiryMinutes}
                onChange={(e) => setAuthExpiryMinutes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Carousel fields */}
        {subtype === 'carousel' && (
          <div className="bg-muted/30 flex flex-col gap-3 rounded-md border p-3">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="carousel-header" className="text-xs">
                {t('templates.carousel_header_format')}
              </FieldLabel>
              <Select
                value={carouselHeaderFormat}
                onValueChange={(v) =>
                  setCarouselHeaderFormat(v as 'IMAGE' | 'VIDEO')
                }
              >
                <SelectTrigger id="carousel-header" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">
                    {t('templates.create.headerFormat.IMAGE')}
                  </SelectItem>
                  <SelectItem value="VIDEO">
                    {t('templates.create.headerFormat.VIDEO')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="carousel-count" className="text-xs">
                {t('templates.carousel_card_count')}
              </FieldLabel>
              <Input
                id="carousel-count"
                type="number"
                min={2}
                max={10}
                className="h-8 w-24 text-xs"
                value={carouselCardCount}
                onChange={(e) =>
                  setCarouselCardCount(
                    Math.min(10, Math.max(2, Number(e.target.value))),
                  )
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="carousel-btn-type" className="text-xs">
                {t('templates.carousel_button_type')}
              </FieldLabel>
              <Select
                value={carouselButtonType}
                onValueChange={(v) =>
                  setCarouselButtonType(v as TemplateButton['type'])
                }
              >
                <SelectTrigger id="carousel-btn-type" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAROUSEL_BUTTON_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>
                      {bt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-muted-foreground text-xs">
              {t('templates.carousel_note')}
            </p>
          </div>
        )}

        {/* Buttons section — standard and LTO only */}
        {subtype !== 'authentication' && subtype !== 'carousel' && (
          <TemplateEditorButtons
            value={buttons}
            onChange={(b) => {
              setButtons(b);
              setButtonErrors([]);
            }}
            errors={buttonErrors}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createTemplate.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createTemplate.isPending}>
            {createTemplate.isPending && <Spinner />}
            {t('templates.create.submit')}
          </Button>
        </div>
      </form>

      <aside className="hidden w-72 shrink-0 lg:sticky lg:top-0 lg:block lg:self-start">
        <WaMessagePreview
          headerText={previewHeaderText}
          bodyText={previewBodyText}
          footerText={
            subtype !== 'authentication' && subtype !== 'carousel'
              ? footerText
              : undefined
          }
          templateName={name}
          buttonLabels={previewButtonLabels}
          isCarousel={subtype === 'carousel'}
          carouselCardCount={
            subtype === 'carousel' ? carouselCardCount : undefined
          }
        />
      </aside>
    </div>
  );
}

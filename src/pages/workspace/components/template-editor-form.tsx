import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon, Video, FileText, Upload } from 'lucide-react';
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
import {
  useCreateTemplate,
  useUploadTemplateMedia,
} from '@/api/hooks/use-templates';
import { toast } from '@/lib/toast';
import type {
  TemplateCategory,
  TemplateComponent,
  TemplateButton,
  WaTemplate,
} from '@/api/templates.api';
import type { TemplateExample } from '@/api/template-examples.api';
import { WaMessagePreview } from '@/components/whatsapp/wa-message-preview';
import { Spinner } from '@/components/ui/spinner';
import {
  findTemplateShapeViolation,
  findContentWarnings,
  type ContentWarning,
} from '@/lib/template-validation';
import {
  detectVarStyle,
  namedVariableKeys,
  type TemplateVarStyle,
} from '@/lib/template-utils';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog';
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

type HeaderType = 'NONE' | 'TEXT' | 'MEDIA';

const AUTH_BODY =
  'Your verification code is {{1}}. Do not share it with anyone.';

const schema = z.object({
  name: z.string().regex(TEMPLATE_NAME_RE, 'templates.create.nameInvalid'),
  language: z.string().min(2),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  bodyText: z.string().min(1, 'templates.create.bodyRequired').max(1024),
  headerFormat: z
    .enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'])
    .optional(),
  headerText: z.string().max(60).optional(),
  footerText: z.string().max(60).optional(),
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
  samples: Record<string, string>,
): string {
  return text.replace(/\{\{([0-9]+|[a-z][a-z0-9_]*)\}\}/gi, (match, key) => {
    const sample = samples[String(key).toLowerCase()]?.trim() ?? samples[key]?.trim();
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
  'bodyText' | 'bodySamples' | 'headerFormat' | 'headerText' | 'footerText' | 'buttons'
> {
  const header = components.find((c) => c.type === 'HEADER');
  const body = components.find((c) => c.type === 'BODY');
  return {
    bodyText: body?.text ?? '',
    bodySamples: body?.example?.body_text?.[0],
    headerFormat: header?.format,
    headerText: header?.text,
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
  const [varStyle, setVarStyle] = useState<TemplateVarStyle>(() =>
    detectVarStyle(seed?.bodyText ?? ''),
  );
  const [bodySamples, setBodySamples] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    seed?.bodySamples?.forEach((v, i) => {
      init[String(i + 1)] = v;
    });
    return init;
  });
  const [bodySampleError, setBodySampleError] = useState('');
  const [bodyShapeError, setBodyShapeError] = useState<string | null>(null);
  const [contentWarnings, setContentWarnings] = useState<ContentWarning[]>([]);
  const [headerHandle, setHeaderHandle] = useState<string | undefined>();
  const [headerFileName, setHeaderFileName] = useState('');
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState('');
  const [headerSampleError, setHeaderSampleError] = useState('');
  const [dirtyExtra, setDirtyExtra] = useState(false);
  const headerFileRef = useRef<HTMLInputElement>(null);
  const bodyAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(
    () => () => {
      if (headerPreviewUrl) URL.revokeObjectURL(headerPreviewUrl);
    },
    [headerPreviewUrl],
  );

  // Header type selector state
  const [headerType, setHeaderType] = useState<HeaderType>(() => {
    if (!seed?.headerFormat) return 'NONE';
    if (seed.headerFormat === 'TEXT') return 'TEXT';
    return 'MEDIA';
  });
  const [mediaFormat, setMediaFormat] = useState<'IMAGE' | 'VIDEO' | 'DOCUMENT'>(() => {
    if (seed?.headerFormat && seed.headerFormat !== 'TEXT') {
      return seed.headerFormat as 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    }
    return 'IMAGE';
  });

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
  const uploadTemplateMedia = useUploadTemplateMedia(slug);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: seed?.name ?? '',
      language: seed?.language ?? 'en_US',
      category: seed?.category ?? 'UTILITY',
      bodyText: seed?.bodyText ?? '',
      headerFormat: seed?.headerFormat ?? undefined,
      headerText: seed?.headerText ?? '',
      footerText: seed?.footerText ?? '',
    },
  });

  const bodyField = register('bodyText', {
    onChange: (e) => handleBodyChange(e.target.value),
  });

  const language = useWatch({ control, name: 'language' });
  const category = useWatch({ control, name: 'category' });
  const name = useWatch({ control, name: 'name' });
  const bodyText = useWatch({ control, name: 'bodyText' });
  const headerFormat = useWatch({ control, name: 'headerFormat' });
  const headerText = useWatch({ control, name: 'headerText' });
  const footerText = useWatch({ control, name: 'footerText' });

  function handleBodyChange(text: string) {
    setContentWarnings(findContentWarnings(text, category as TemplateCategory));
    setBodyShapeError(null);
  }

  function handleBodyBlur() {
    const error = findTemplateShapeViolation({
      name,
      category: category as TemplateCategory,
      bodyText: bodyText ?? '',
      headerText: headerFormat === 'TEXT' ? (headerText ?? '') : undefined,
    });
    setBodyShapeError(error);
  }

  const bodyVarKeys = useMemo(() => {
    const text = subtype === 'authentication' ? AUTH_BODY : (bodyText ?? '');
    if (varStyle === 'named') return namedVariableKeys(text);
    return bodyVariableIndexes(text).map(String);
  }, [bodyText, subtype, varStyle]);

  const blocker = useUnsavedChanges(
    (isDirty || dirtyExtra) && !createTemplate.isPending,
  );

  const previewBodyText = useMemo(() => {
    if (subtype === 'authentication') return AUTH_BODY;
    return substituteBodyVariables(bodyText ?? '', bodySamples);
  }, [bodyText, bodySamples, subtype]);

  const previewHeaderText = headerFormat === 'TEXT' ? headerText : undefined;
  const previewHeaderMedia =
    headerType === 'MEDIA'
      ? { format: mediaFormat, url: headerPreviewUrl || undefined }
      : undefined;

  function updateBodySample(key: string, value: string) {
    setDirtyExtra(true);
    setBodySamples((prev) => ({ ...prev, [key]: value }));
    setBodySampleError('');
  }

  function insertVariable() {
    const el = bodyAreaRef.current;
    const current = bodyText ?? '';
    let token: string;
    if (varStyle === 'named') {
      const next = namedVariableKeys(current).length + 1;
      token = `{{var_${next}}}`;
    } else {
      const next = (bodyVariableIndexes(current).at(-1) ?? 0) + 1;
      token = `{{${next}}}`;
    }
    if (!el) {
      setValue('bodyText', `${current}${token}`, { shouldDirty: true });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    setValue('bodyText', next, { shouldDirty: true });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function validateButtons(): string[] {
    const urlCount = buttons.filter((b) => b.type === 'URL').length;
    const phoneCount = buttons.filter((b) => b.type === 'PHONE_NUMBER').length;
    const fixed = new Set([
      'COPY_CODE',
      'REQUEST_CONTACT_INFO',
      'CATALOG',
      'MPM',
    ]);
    let seenUrl = 0;
    let seenPhone = 0;
    return buttons.map((b) => {
      if (!fixed.has(b.type) && !b.text.trim())
        return t('templates.create.buttons.errorText');
      if (b.type === 'URL') {
        seenUrl += 1;
        if (urlCount > 2 && seenUrl > 2)
          return t('templates.create.buttons.errorUrlMax');
        if (!b.url?.trim()) return t('templates.create.buttons.errorUrl');
        if (/\{\{1\}\}/.test(b.url) && !b.example?.[0]?.trim()) {
          return t('templates.create.buttons.errorUrlSample');
        }
      }
      if (b.type === 'PHONE_NUMBER') {
        seenPhone += 1;
        if (phoneCount > 1 && seenPhone > 1)
          return t('templates.create.buttons.errorPhoneMax');
        if (!b.phone_number?.trim())
          return t('templates.create.buttons.errorPhone');
      }
      if (b.type === 'COPY_CODE' && !b.example?.[0]?.trim()) {
        return t('templates.create.buttons.errorOfferCode');
      }
      if (b.type === 'FLOW' && !b.flow_id?.trim()) {
        return t('templates.create.buttons.errorFlow');
      }
      return '';
    });
  }

  const onSubmit = (v: FormValues) => {
    const shapeError = findTemplateShapeViolation({
      name: v.name,
      category: v.category as TemplateCategory,
      bodyText: subtype === 'authentication' ? AUTH_BODY : v.bodyText,
      headerText: v.headerFormat === 'TEXT' ? v.headerText : undefined,
    });
    if (shapeError) {
      setBodyShapeError(shapeError);
      return;
    }

    const showButtons = subtype !== 'authentication' && subtype !== 'carousel';

    if (showButtons) {
      const errs = validateButtons();
      if (errs.some(Boolean)) {
        setButtonErrors(errs);
        return;
      }
    }

    if (headerType === 'MEDIA' && !headerHandle) {
      setHeaderSampleError(t('templates.create.mediaSampleRequired'));
      return;
    }

    if (subtype !== 'authentication') {
      const missingSample = bodyVarKeys.some((n) => !bodySamples[n]?.trim());
      if (missingSample) {
        setBodySampleError(t('templates.create.sampleRequired'));
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
    } else if (v.headerFormat) {
      components.push({
        type: 'HEADER',
        format: v.headerFormat,
        example: headerHandle ? { header_handle: [headerHandle] } : undefined,
      });
    }

    if (subtype === 'authentication') {
      components.push({ type: 'BODY', text: AUTH_BODY });
    } else {
      const bodyComponent: TemplateComponent = {
        type: 'BODY',
        text: v.bodyText,
      };
      if (bodyVarKeys.length > 0) {
        bodyComponent.example =
          varStyle === 'named'
            ? {
                body_text_named_params: bodyVarKeys.map((name) => ({
                  param_name: name,
                  example: bodySamples[name]?.trim() ?? '',
                })),
              }
            : {
                body_text: [bodyVarKeys.map((n) => bodySamples[n]?.trim() ?? '')],
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
        buttons: [{ type: 'OTP', text: t('templates.auth_copy_code'), otp_type: 'COPY_CODE' }],
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

  const previewButtons = useMemo(() => {
    if (subtype === 'authentication') {
      return authCopyCode
        ? [{ type: 'COPY_CODE' as const, text: t('templates.auth_copy_code', 'Copy code') }]
        : [];
    }
    if (subtype === 'carousel') return [];
    return buttons;
  }, [subtype, buttons, authCopyCode, t]);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
      <form
        onSubmit={handleSubmit((values) => onSubmit(values as FormValues))}
        className="flex min-w-0 flex-col gap-4"
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
            <div className="flex items-center justify-between">
              <FieldLabel>{t('templates.create.headerOptional')}</FieldLabel>
            </div>
            <p className="text-muted-foreground text-xs">
              {t('templates.create.headerHint', 'Add a title or choose which type of media you will use for this header.')}
            </p>

            {/* Header type selector */}
            <div className="flex gap-2">
              {(['NONE', 'TEXT', 'MEDIA'] as HeaderType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setHeaderType(type);
                    if (type === 'NONE') setValue('headerFormat', undefined);
                    else if (type === 'TEXT') setValue('headerFormat', 'TEXT');
                    else setValue('headerFormat', mediaFormat);
                  }}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    headerType === type
                      ? 'border-[#0e8a6a] bg-[#e8f5f2] text-[#0e8a6a] dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {type === 'NONE' ? t('templates.create.headerNone', 'None')
                    : type === 'TEXT' ? t('templates.create.headerTypeText', 'Text')
                    : t('templates.create.headerTypeMedia', 'Media')}
                </button>
              ))}
            </div>

            {/* Text header input */}
            {headerType === 'TEXT' && (
              <Input
                id="tpl-header"
                placeholder={t('templates.create.headerPlaceholder')}
                maxLength={60}
                {...register('headerText')}
              />
            )}

            {/* Media type cards */}
            {headerType === 'MEDIA' && (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'IMAGE', label: t('templates.create.headerFormat.IMAGE', 'Image'), Icon: ImageIcon },
                    { value: 'VIDEO', label: t('templates.create.headerFormat.VIDEO', 'Video'), Icon: Video },
                    { value: 'DOCUMENT', label: t('templates.create.headerFormat.DOCUMENT', 'Document'), Icon: FileText },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMediaFormat(value);
                      setValue('headerFormat', value);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      mediaFormat === value
                        ? 'border-[#0e8a6a] bg-[#e8f5f2] dark:border-emerald-500 dark:bg-emerald-950/30'
                        : 'border-border hover:border-foreground/30'
                    }`}
                  >
                    <Icon className="size-8 text-[#6b7280]" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {headerType === 'MEDIA' && (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs">
                  {t('templates.create.mediaHint')}
                </p>
                <input
                  ref={headerFileRef}
                  type="file"
                  className="hidden"
                  accept={
                    mediaFormat === 'IMAGE'
                      ? 'image/jpeg,image/png,image/webp'
                      : mediaFormat === 'VIDEO'
                        ? 'video/mp4,video/3gpp'
                        : 'application/pdf'
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (headerFileRef.current) headerFileRef.current.value = '';
                    if (!file) return;
                    setDirtyExtra(true);
                    setHeaderSampleError('');
                    setHeaderPreviewUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return URL.createObjectURL(file);
                    });
                    uploadTemplateMedia.mutate(file, {
                      onSuccess: (res) => {
                        setHeaderHandle(res.handle);
                        setHeaderFileName(file.name);
                      },
                      onError: (err) => toast.error(err),
                    });
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploadTemplateMedia.isPending}
                    onClick={() => headerFileRef.current?.click()}
                  >
                    {uploadTemplateMedia.isPending ? (
                      <Spinner className="mr-1" />
                    ) : (
                      <Upload className="mr-1 size-3" />
                    )}
                    {headerFileName
                      ? t('templates.create.mediaReplace')
                      : t('templates.create.mediaUpload')}
                  </Button>
                  {headerFileName && (
                    <span className="text-muted-foreground truncate text-xs">
                      {headerFileName}
                    </span>
                  )}
                </div>
                {headerSampleError && (
                  <FieldError errors={[{ message: headerSampleError }]} />
                )}
              </div>
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
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="tpl-body">
                {t('templates.create.body')}
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Select
                  value={varStyle}
                  onValueChange={(v) => {
                    setDirtyExtra(true);
                    setVarStyle(v as TemplateVarStyle);
                  }}
                >
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positional">
                      {t('templates.create.varPositional')}
                    </SelectItem>
                    <SelectItem value="named">
                      {t('templates.create.varNamed')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={insertVariable}
                >
                  {t('templates.create.addVariable')}
                </Button>
              </div>
            </div>
            <Textarea
              id="tpl-body"
              rows={5}
              placeholder={
                varStyle === 'named'
                  ? t('templates.create.bodyPlaceholderNamed')
                  : t('templates.create.bodyPlaceholder')
              }
              aria-invalid={!!errors.bodyText || !!bodyShapeError}
              {...bodyField}
              ref={(el) => {
                bodyField.ref(el);
                bodyAreaRef.current = el;
              }}
              onBlur={handleBodyBlur}
            />
            <p className="text-muted-foreground text-xs">
              {t('templates.create.bodyHint')}
            </p>
            {(errors.bodyText || bodyShapeError) && (
              <FieldError
                errors={[{ message: bodyShapeError ?? t(errors.bodyText!.message!) }]}
              />
            )}
            {contentWarnings.map((w) => (
              <div
                key={w.code}
                className={`rounded-md border px-3 py-2 text-xs ${
                  w.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
                }`}
              >
                {w.message}
              </div>
            ))}

            {bodyVarKeys.length > 0 && (
              <div className="bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
                <p className="text-xs font-semibold">
                  {t('templates.create.sampleValuesTitle')}
                </p>
                {bodyVarKeys.map((n) => (
                  <div key={n} className="flex flex-col gap-1">
                    <FieldLabel htmlFor={`tpl-sample-${n}`} className="text-xs">
                      {t('templates.create.sampleFor', {
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
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="tpl-footer" className="mb-0">
                {t('templates.create.footerOptional')}
              </FieldLabel>
              {footerText && (
                <button
                  type="button"
                  onClick={() => setValue('footerText', '')}
                  className="text-muted-foreground hover:text-foreground ml-auto text-xs underline"
                >
                  {t('common.clear', 'Clear')}
                </button>
              )}
            </div>
            <Input
              id="tpl-footer"
              placeholder={t('templates.create.footerPlaceholder', 'Add a footer (optional)')}
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
              setDirtyExtra(true);
              setButtons(b);
              setButtonErrors([]);
            }}
            errors={buttonErrors}
          />
        )}

        <UnsavedChangesDialog blocker={blocker} />

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

      <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
        <WaMessagePreview
          headerText={previewHeaderText}
          headerMedia={previewHeaderMedia}
          bodyText={previewBodyText}
          footerText={
            subtype !== 'authentication' && subtype !== 'carousel'
              ? footerText
              : undefined
          }
          templateName={name}
          buttons={previewButtons}
          isCarousel={subtype === 'carousel'}
          carouselCardCount={
            subtype === 'carousel' ? carouselCardCount : undefined
          }
        />
      </aside>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
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

const TEMPLATE_NAME_RE = /^[a-z0-9_]{1,512}$/;

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

const BUTTON_TYPES: { value: TemplateButton['type']; label: string }[] = [
  { value: 'QUICK_REPLY', label: 'Quick reply' },
  { value: 'URL', label: 'Visit website (URL)' },
  { value: 'PHONE_NUMBER', label: 'Call phone number' },
];

const MAX_BUTTONS = 3;

type ButtonRow = {
  type: TemplateButton['type'];
  text: string;
  url: string;
  urlExample: string;
  phoneNumber: string;
};

function emptyButton(): ButtonRow {
  return {
    type: 'QUICK_REPLY',
    text: '',
    url: '',
    urlExample: '',
    phoneNumber: '',
  };
}

function urlHasVariable(url: string): boolean {
  return /\{\{1\}\}/.test(url);
}

function urlExampleSuffix(url: string, sample: string): string {
  const prefix = url.split('{{1}}')[0] ?? '';
  if (prefix && sample.startsWith(prefix)) return sample.slice(prefix.length);
  return sample;
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

const HEADER_FORMATS: NonNullable<TemplateComponent['format']>[] = [
  'TEXT',
  'IMAGE',
  'VIDEO',
  'DOCUMENT',
];

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
  buttons?: ButtonRow[];
  banner?: 'copyApproved' | 'resubmitRejected';
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

function buttonsFromComponents(components: TemplateComponent[]): ButtonRow[] {
  const raw = components.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  return raw.map((b) => ({
    type: b.type,
    text: b.text,
    url: b.url ?? '',
    urlExample: b.example?.[0] ?? '',
    phoneNumber: b.phone_number ?? '',
  }));
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
  const [buttons, setButtons] = useState<ButtonRow[]>(seed?.buttons ?? []);
  const [buttonErrors, setButtonErrors] = useState<string[]>([]);
  const [bodySamples, setBodySamples] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    seed?.bodySamples?.forEach((v, i) => {
      init[i + 1] = v;
    });
    return init;
  });
  const [bodySampleError, setBodySampleError] = useState('');
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
    () => bodyVariableIndexes(bodyText ?? ''),
    [bodyText],
  );

  const previewBodyText = useMemo(
    () => substituteBodyVariables(bodyText ?? '', bodySamples),
    [bodyText, bodySamples],
  );

  const previewHeaderText = headerFormat === 'TEXT' ? headerText : undefined;

  function updateBodySample(index: number, value: string) {
    setBodySamples((prev) => ({ ...prev, [index]: value }));
    setBodySampleError('');
  }

  function addButton() {
    if (buttons.length >= MAX_BUTTONS) return;
    setButtons((prev) => [...prev, emptyButton()]);
    setButtonErrors([]);
  }

  function removeButton(index: number) {
    setButtons((prev) => prev.filter((_, i) => i !== index));
    setButtonErrors([]);
  }

  function updateButton<K extends keyof ButtonRow>(
    index: number,
    key: K,
    value: ButtonRow[K],
  ) {
    setButtons((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [key]: value } : b)),
    );
    setButtonErrors([]);
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
        if (!b.url.trim())
          return t('templates.create.buttons.errorUrl', 'URL is required');
        if (urlHasVariable(b.url) && !b.urlExample.trim())
          return t(
            'templates.create.buttons.errorUrlExample',
            'A sample value for {{1}} is required (the suffix only, e.g. ORDER123)',
          );
      }
      if (b.type === 'PHONE_NUMBER') {
        seenPhone += 1;
        if (phoneCount > 1 && seenPhone > 1)
          return t(
            'templates.create.buttons.errorPhoneMax',
            'Meta allows only one call button',
          );
        if (!b.phoneNumber.trim())
          return t(
            'templates.create.buttons.errorPhone',
            'Phone number is required',
          );
      }
      return '';
    });
  }

  const onSubmit = (v: FormValues) => {
    const errs = validateButtons();
    if (errs.some(Boolean)) {
      setButtonErrors(errs);
      return;
    }

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

    const components: TemplateComponent[] = [];
    if (v.headerFormat === 'TEXT') {
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

    const bodyComponent: TemplateComponent = { type: 'BODY', text: v.bodyText };
    if (bodyVariables.length > 0) {
      bodyComponent.example = {
        body_text: [bodyVariables.map((n) => bodySamples[n]?.trim() ?? '')],
      };
    }
    components.push(bodyComponent);

    if (v.footerText?.trim()) {
      components.push({ type: 'FOOTER', text: v.footerText.trim() });
    }

    if (buttons.length > 0) {
      const builtButtons: TemplateButton[] = buttons.map((b) => {
        if (b.type === 'QUICK_REPLY') {
          return { type: 'QUICK_REPLY', text: b.text.trim() };
        }
        if (b.type === 'URL') {
          const url = b.url.trim();
          const btn: TemplateButton = {
            type: 'URL',
            text: b.text.trim(),
            url,
          };
          if (urlHasVariable(url) && b.urlExample.trim()) {
            btn.example = [urlExampleSuffix(url, b.urlExample.trim())];
          }
          return btn;
        }
        return {
          type: 'PHONE_NUMBER',
          text: b.text.trim(),
          phone_number: b.phoneNumber.replace(/\D/g, ''),
        };
      });
      const callToAction = builtButtons.filter((b) => b.type !== 'QUICK_REPLY');
      const quickReplies = builtButtons.filter((b) => b.type === 'QUICK_REPLY');
      components.push({
        type: 'BUTTONS',
        buttons: [...callToAction, ...quickReplies],
      });
    }

    createTemplate.mutate(
      {
        name: v.name,
        language: v.language,
        category: v.category,
        components,
      },
      {
        onSuccess: () => {
          toast.success(t('templates.create.success'));
          onSuccess();
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const buttonLabels = buttons.map((b) => b.text.trim()).filter(Boolean);

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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <FieldLabel>
              {t('templates.create.buttons.label', 'Buttons')}{' '}
              <span className="text-muted-foreground font-normal">
                ({t('templates.create.buttons.optional', 'optional, max 3')})
              </span>
            </FieldLabel>
            {buttons.length < MAX_BUTTONS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addButton}
                className="h-7 text-xs"
              >
                <Plus className="mr-1 size-3" />
                {t('templates.create.buttons.add', 'Add button')}
              </Button>
            )}
          </div>

          {buttons.length === 0 && (
            <p className="text-muted-foreground text-xs">
              {t(
                'templates.create.buttons.hint',
                'Add up to 3 buttons — quick replies, website links, or a call number.',
              )}
            </p>
          )}

          {buttons.map((btn, idx) => (
            <div
              key={idx}
              className="bg-muted/30 flex flex-col gap-2 rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {t('templates.create.buttons.buttonN', 'Button {{n}}', {
                    n: idx + 1,
                  })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => removeButton(idx)}
                  aria-label={t(
                    'templates.create.buttons.remove',
                    'Remove button',
                  )}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor={`btn-type-${idx}`} className="text-xs">
                  {t('templates.create.buttons.type', 'Type')}
                </FieldLabel>
                <Select
                  value={btn.type}
                  onValueChange={(v) =>
                    updateButton(idx, 'type', v as TemplateButton['type'])
                  }
                >
                  <SelectTrigger id={`btn-type-${idx}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_TYPES.map((bt) => (
                      <SelectItem key={bt.value} value={bt.value}>
                        {bt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor={`btn-text-${idx}`} className="text-xs">
                  {t('templates.create.buttons.buttonText', 'Button label')}
                </FieldLabel>
                <Input
                  id={`btn-text-${idx}`}
                  className="h-8 text-xs"
                  maxLength={25}
                  value={btn.text}
                  onChange={(e) => updateButton(idx, 'text', e.target.value)}
                />
              </div>

              {btn.type === 'URL' && (
                <>
                  <Input
                    className="h-8 text-xs"
                    placeholder="https://example.com/track/{{1}}"
                    value={btn.url}
                    onChange={(e) => updateButton(idx, 'url', e.target.value)}
                  />
                  {urlHasVariable(btn.url) && (
                    <Input
                      className="h-8 text-xs"
                      placeholder="ORDER123"
                      value={btn.urlExample}
                      onChange={(e) =>
                        updateButton(idx, 'urlExample', e.target.value)
                      }
                    />
                  )}
                </>
              )}

              {btn.type === 'PHONE_NUMBER' && (
                <Input
                  className="h-8 text-xs"
                  placeholder="+919876543210"
                  value={btn.phoneNumber}
                  onChange={(e) =>
                    updateButton(idx, 'phoneNumber', e.target.value)
                  }
                />
              )}

              {buttonErrors[idx] && (
                <FieldError errors={[{ message: buttonErrors[idx] }]} />
              )}
            </div>
          ))}
        </div>

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
          footerText={footerText}
          templateName={name}
          buttonLabels={buttonLabels}
        />
      </aside>
    </div>
  );
}

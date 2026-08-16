import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { TemplateCategory, TemplateComponent } from '@/api/templates.api';
import type { TemplateExample } from '@/lib/template-examples';
import { WaMessagePreview } from '@/components/whatsapp/wa-message-preview';

// Meta template name: lowercase letters, digits, underscores; 1–512 chars.
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

const schema = z.object({
  name: z.string().regex(TEMPLATE_NAME_RE, 'templates.create.nameInvalid'),
  language: z.string().min(2),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  bodyText: z.string().min(1, 'templates.create.bodyRequired').max(1024),
  headerText: z.string().max(60).optional(),
  footerText: z.string().max(60).optional(),
});
type FormValues = z.infer<typeof schema>;

export interface CreateTemplateSeed {
  name: string;
  language: string;
  category: TemplateCategory;
  bodyText: string;
  headerText?: string;
  footerText?: string;
}

interface CreateTemplateDialogProps {
  slug: string;
  /** When set, dialog opens with these values (from example gallery). */
  seed?: CreateTemplateSeed | null;
  seedKey?: number;
  onSeedConsumed?: () => void;
}

function seedFromExample(example: TemplateExample): CreateTemplateSeed {
  return {
    name: example.suggestedName,
    language: example.language,
    category: example.category,
    bodyText: example.components.find((c) => c.type === 'BODY')?.text ?? '',
    headerText: example.components.find((c) => c.type === 'HEADER')?.text,
    footerText: example.components.find((c) => c.type === 'FOOTER')?.text,
  };
}

export { seedFromExample };

export function CreateTemplateDialog({
  slug,
  seed,
  seedKey = 0,
  onSeedConsumed,
}: CreateTemplateDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const createTemplate = useCreateTemplate(slug);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      language: 'en_US',
      category: 'UTILITY',
      bodyText: '',
      headerText: '',
      footerText: '',
    },
  });

  const language = useWatch({ control, name: 'language' });
  const category = useWatch({ control, name: 'category' });
  const name = useWatch({ control, name: 'name' });
  const bodyText = useWatch({ control, name: 'bodyText' });
  const headerText = useWatch({ control, name: 'headerText' });
  const footerText = useWatch({ control, name: 'footerText' });

  useEffect(() => {
    if (!seed) return;
    reset({
      name: seed.name,
      language: seed.language,
      category: seed.category,
      bodyText: seed.bodyText,
      headerText: seed.headerText ?? '',
      footerText: seed.footerText ?? '',
    });
    setOpen(true);
    onSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const onSubmit = (v: FormValues) => {
    const components: TemplateComponent[] = [];
    if (v.headerText?.trim()) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: v.headerText.trim(),
      });
    }
    components.push({ type: 'BODY', text: v.bodyText });
    if (v.footerText?.trim()) {
      components.push({ type: 'FOOTER', text: v.footerText.trim() });
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
          reset();
          setOpen(false);
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 size-3.5" />
          {t('templates.createCta')}
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl max-h-[92vh] grid-cols-1">
        <div className="flex max-h-[92vh] flex-col sm:flex-row">
          {/* ── Left: form ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-6"
          >
            <DialogHeader>
              <DialogTitle>{t('templates.create.title')}</DialogTitle>
              <DialogDescription>
                {t('templates.create.subtitle')}
              </DialogDescription>
            </DialogHeader>

            {/* Meta review info panel (educational) */}
            <div className="bg-muted/40 rounded-md border px-3 py-2 text-xs">
              <p className="font-medium">{t('templates.create.reviewTitle')}</p>
              <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5">
                <li>
                  {t('templates.create.reviewName')}:{' '}
                  <span className="font-mono text-foreground">
                    {name || '—'}
                  </span>
                </li>
                <li>
                  {t('templates.create.reviewCategory')}: {category} · {language}
                </li>
                <li>
                  {t('templates.create.reviewBody')}:{' '}
                  {bodyText
                    ? `${bodyText.slice(0, 80)}${bodyText.length > 80 ? '…' : ''}`
                    : '—'}
                </li>
              </ul>
            </div>

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
                  onValueChange={(v) =>
                    setValue('category', v as TemplateCategory)
                  }
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
              <FieldLabel htmlFor="tpl-header">
                {t('templates.create.headerOptional')}
              </FieldLabel>
              <Input
                id="tpl-header"
                placeholder={t('templates.create.headerPlaceholder')}
                maxLength={60}
                {...register('headerText')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="tpl-body">
                {t('templates.create.body')}
              </FieldLabel>
              <Textarea
                id="tpl-body"
                rows={4}
                placeholder={t('templates.create.bodyPlaceholder')}
                aria-invalid={!!errors.bodyText}
                {...register('bodyText')}
              />
              <p className="text-muted-foreground text-xs">
                {t('templates.create.bodyHint')}
              </p>
              {errors.bodyText && (
                <FieldError
                  errors={[{ message: t(errors.bodyText.message!) }]}
                />
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

            {(headerText || footerText) && (
              <p className="text-muted-foreground text-xs">
                {t('templates.create.componentsNote')}
              </p>
            )}

            <DialogFooter className="mx-0 mb-0 mt-auto rounded-none border-0 bg-transparent p-0 pt-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createTemplate.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending && <Spinner />}
                {t('templates.create.submit')}
              </Button>
            </DialogFooter>
          </form>

          {/* ── Right: live WhatsApp preview ── */}
          <aside className="bg-muted/20 hidden w-72 shrink-0 flex-col items-center gap-4 overflow-y-auto border-l px-4 py-6 sm:flex">
            <WaMessagePreview
              headerText={headerText}
              bodyText={bodyText}
              footerText={footerText}
              templateName={name}
            />
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

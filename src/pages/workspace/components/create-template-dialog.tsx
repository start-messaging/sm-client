import { useState } from 'react';
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
import type { TemplateCategory } from '@/api/templates.api';

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
  name: z
    .string()
    .regex(
      TEMPLATE_NAME_RE,
      'templates.create.nameInvalid',
    ),
  language: z.string().min(2),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  bodyText: z.string().min(1, 'templates.create.bodyRequired').max(1024),
});
type FormValues = z.infer<typeof schema>;

interface CreateTemplateDialogProps {
  slug: string;
}

export function CreateTemplateDialog({ slug }: CreateTemplateDialogProps) {
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
    },
  });

  const language = useWatch({ control, name: 'language' });
  const category = useWatch({ control, name: 'category' });

  const onSubmit = (v: FormValues) =>
    createTemplate.mutate(
      {
        name: v.name,
        language: v.language,
        category: v.category,
        components: [
          {
            type: 'BODY',
            text: v.bodyText,
          },
        ],
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

      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('templates.create.title')}</DialogTitle>
            <DialogDescription>{t('templates.create.subtitle')}</DialogDescription>
          </DialogHeader>

          {/* Name */}
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
              <FieldError
                errors={[{ message: t(errors.name.message!) }]}
              />
            )}
          </div>

          {/* Language + Category side by side */}
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

          {/* Body text */}
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

          <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}

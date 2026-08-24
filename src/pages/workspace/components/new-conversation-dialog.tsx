import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Spinner } from '@/components/ui/spinner';
import { useCreateConversation } from '@/api/hooks/use-messages';
import { toast } from '@/lib/toast';
import type { WaConversation } from '@/api/messages.api';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  PhoneWithCountry,
  findCountryByCode,
} from '@/components/phone/phone-with-country';

// National-number: 4–14 digits (spaces stripped before validation)
const schema = z.object({
  nationalNumber: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(
      z
        .string()
        .min(4, 'inbox.newConversation.nationalNumberMin')
        .max(14, 'inbox.newConversation.nationalNumberMax')
        .regex(/^\d+$/, 'inbox.newConversation.nationalNumberDigits'),
    ),
  contactName: z.string().max(120).optional(),
});
type FormValues = z.infer<typeof schema>;

interface NewConversationDialogProps {
  slug: string;
  onCreated: (conversation: WaConversation) => void;
  trigger?: ReactNode;
}

export function NewConversationDialog({
  slug,
  onCreated,
  trigger,
}: NewConversationDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const create = useCreateConversation(slug);

  const workspace = useCurrentWorkspace();
  // Derive default dial code from workspace country; fall back to India (+91)
  const defaultCountryCode = workspace?.countryCode ?? 'IN';
  const defaultDialCode = findCountryByCode(defaultCountryCode).dialCode;

  // Dial code is managed in React state (not form) — it doesn't need validation
  const [dialCode, setDialCode] = useState(defaultDialCode);
  // National number is display value (may include spaces); form strips them
  const [nationalDisplay, setNationalDisplay] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nationalNumber: '', contactName: '' },
  });

  // Keep the hidden form field in sync with display value
  const handleNationalChange = (value: string) => {
    setNationalDisplay(value);
    setValue('nationalNumber', value, { shouldValidate: false });
  };

  const resetForm = () => {
    reset({ nationalNumber: '', contactName: '' });
    setNationalDisplay('');
    setDialCode(findCountryByCode(defaultCountryCode).dialCode);
  };

  const onSubmit = (v: FormValues) => {
    // v.nationalNumber is already stripped of spaces by the Zod transform
    const contactPhone = `+${dialCode}${v.nationalNumber}`;
    create.mutate(
      { contactPhone, contactName: v.contactName || undefined },
      {
        onSuccess: (conv) => {
          toast.success(t('inbox.newConversation.success'));
          resetForm();
          setOpen(false);
          onCreated(conv);
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="mr-1.5 size-3.5" />
            {t('inbox.newConversation.trigger')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('inbox.newConversation.title')}</DialogTitle>
            <DialogDescription>
              {t('inbox.newConversation.subtitle')}
            </DialogDescription>
          </DialogHeader>

          {/* Hidden field keeps react-hook-form aware of nationalNumber */}
          <input type="hidden" {...register('nationalNumber')} />

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="conv-national-number">
              {t('inbox.newConversation.phone')}
            </FieldLabel>
            <PhoneWithCountry
              dialCode={dialCode}
              onDialCodeChange={setDialCode}
              nationalNumber={nationalDisplay}
              onNationalNumberChange={handleNationalChange}
              aria-invalid={!!errors.nationalNumber}
              disabled={create.isPending}
            />
            {errors.nationalNumber && (
              <FieldError
                errors={[
                  {
                    message: t(
                      (errors.nationalNumber as { message?: string }).message ??
                        'inbox.newConversation.nationalNumberMin',
                    ),
                  },
                ]}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="conv-name">
              {t('inbox.newConversation.name')}
            </FieldLabel>
            <Input
              id="conv-name"
              placeholder={t('inbox.newConversation.namePlaceholder')}
              aria-invalid={!!errors.contactName}
              {...register('contactName')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              {t('inbox.newConversation.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

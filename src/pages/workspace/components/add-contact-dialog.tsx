import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
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
import { useCreateContact } from '@/api/hooks/use-contacts';
import { toast } from '@/lib/toast';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  PhoneWithCountry,
  findCountryByCode,
} from '@/components/phone/phone-with-country';

const schema = z.object({
  nationalNumber: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(
      z
        .string()
        .min(4, 'contacts.add.nationalNumberMin')
        .max(14, 'contacts.add.nationalNumberMax')
        .regex(/^\d+$/, 'contacts.add.nationalNumberDigits'),
    ),
  name: z.string().max(120).optional(),
});
type FormValues = z.infer<typeof schema>;

export function AddContactDialog({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const create = useCreateContact(slug);

  const workspace = useCurrentWorkspace();
  const defaultCountryCode = workspace?.countryCode ?? 'IN';
  const defaultDialCode = findCountryByCode(defaultCountryCode).dialCode;

  const [dialCode, setDialCode] = useState(defaultDialCode);
  const [nationalDisplay, setNationalDisplay] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nationalNumber: '', name: '' },
  });

  const handleNationalChange = (value: string) => {
    setNationalDisplay(value);
    setValue('nationalNumber', value, { shouldValidate: false });
  };

  const resetForm = () => {
    reset({ nationalNumber: '', name: '' });
    setNationalDisplay('');
    setDialCode(findCountryByCode(defaultCountryCode).dialCode);
  };

  const onSubmit = (v: FormValues) => {
    const phoneE164 = `+${dialCode}${v.nationalNumber}`;
    create.mutate(
      { phoneE164, name: v.name || undefined },
      {
        onSuccess: () => {
          toast.success(t('contacts.add.success'));
          resetForm();
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
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-1.5 size-4" />
          {t('contacts.addCta')}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('contacts.add.title')}</DialogTitle>
            <DialogDescription>{t('contacts.add.subtitle')}</DialogDescription>
          </DialogHeader>

          <input type="hidden" {...register('nationalNumber')} />

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="contact-national-number">
              {t('contacts.add.phone')}
            </FieldLabel>
            <PhoneWithCountry
              dialCode={dialCode}
              onDialCodeChange={setDialCode}
              nationalNumber={nationalDisplay}
              onNationalNumberChange={handleNationalChange}
              inputId="contact-national-number"
              aria-invalid={!!errors.nationalNumber}
              disabled={create.isPending}
            />
            {errors.nationalNumber ? (
              <FieldError
                errors={[
                  {
                    message: t(
                      (errors.nationalNumber as { message?: string }).message ??
                        'contacts.add.nationalNumberMin',
                    ),
                  },
                ]}
              />
            ) : (
              <p className="text-muted-foreground text-xs">
                {t('contacts.add.phoneHint')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="contact-name">
              {t('contacts.add.name')}
            </FieldLabel>
            <Input
              id="contact-name"
              type="text"
              placeholder={t('contacts.add.namePlaceholder')}
              {...register('name')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              {t('contacts.add.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
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

const schema = z.object({
  contactPhone: z
    .string()
    .min(7, 'inbox.newConversation.phoneMin')
    .regex(/^\+?\d[\d\s\-().]{5,}$/, 'inbox.newConversation.phoneInvalid'),
  contactName: z.string().max(120).optional(),
});
type FormValues = z.infer<typeof schema>;

interface NewConversationDialogProps {
  slug: string;
  onCreated: (conversation: WaConversation) => void;
}

export function NewConversationDialog({
  slug,
  onCreated,
}: NewConversationDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const create = useCreateConversation(slug);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contactPhone: '', contactName: '' },
  });

  const onSubmit = (v: FormValues) =>
    create.mutate(
      { contactPhone: v.contactPhone, contactName: v.contactName || undefined },
      {
        onSuccess: (conv) => {
          toast.success(t('inbox.newConversation.success'));
          reset();
          setOpen(false);
          onCreated(conv);
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
        <Button size="sm" variant="outline">
          <Plus className="mr-1.5 size-3.5" />
          {t('inbox.newConversation.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('inbox.newConversation.title')}</DialogTitle>
            <DialogDescription>
              {t('inbox.newConversation.subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="conv-phone">
              {t('inbox.newConversation.phone')}
            </FieldLabel>
            <Input
              id="conv-phone"
              type="tel"
              placeholder="+91 98765 43210"
              aria-invalid={!!errors.contactPhone}
              {...register('contactPhone')}
            />
            {errors.contactPhone && (
              <FieldError
                errors={[{ message: t(errors.contactPhone.message!) }]}
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
              onClick={() => setOpen(false)}
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

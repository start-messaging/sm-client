import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useInviteMember } from '@/api/hooks/use-members';
import { toast } from '@/lib/toast';
import { ROLE_RANK, WorkspaceRole } from '@/types/api';

const schema = z.object({
  email: z.string().email('members.invite.emailInvalid'),
  role: z.enum([
    WorkspaceRole.ADMIN,
    WorkspaceRole.MANAGER,
    WorkspaceRole.AGENT,
    WorkspaceRole.VIEWER,
  ]),
});
type FormValues = z.infer<typeof schema>;

/** Invite an email with a role strictly below the actor's own. */
export function InviteMemberDialog({
  slug,
  workspaceId,
  myRole,
}: {
  slug: string;
  workspaceId: string;
  myRole: WorkspaceRole;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const invite = useInviteMember(slug, workspaceId);

  // Only roles ranked below the actor are invitable (mirrors the server).
  const invitableRoles = (
    [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MANAGER,
      WorkspaceRole.AGENT,
      WorkspaceRole.VIEWER,
    ] as const
  ).filter((r) => ROLE_RANK[r] < ROLE_RANK[myRole]);

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
      email: '',
      role: invitableRoles[invitableRoles.length - 1],
    },
  });
  const role = useWatch({ control, name: 'role' });

  const onSubmit = (v: FormValues) =>
    invite.mutate(v, {
      onSuccess: () => {
        toast.success(t('members.invite.sent'));
        reset();
        setOpen(false);
      },
      onError: (err) => toast.error(err),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          {t('members.invite.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('members.invite.title')}</DialogTitle>
            <DialogDescription>
              {t('members.invite.subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="invite-email">
              {t('members.invite.email')}
            </FieldLabel>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@example.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email ? (
              <FieldError errors={[{ message: t(errors.email.message!) }]} />
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="invite-role">
              {t('members.invite.role')}
            </FieldLabel>
            <Select
              value={role}
              onValueChange={(v) => setValue('role', v as FormValues['role'])}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {invitableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`roles.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending && <Spinner />}
              {t('members.invite.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

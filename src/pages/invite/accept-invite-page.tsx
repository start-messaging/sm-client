import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useAcceptInvite,
  useClaimInvite,
  useInvitePreview,
} from '@/api/hooks/use-members';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth.store';

const claimSchema = z.object({
  fullName: z.string().trim().min(1, 'invite.nameRequired').max(120),
  password: z.string().min(8, 'invite.passwordShort').max(72),
});
type ClaimValues = z.infer<typeof claimSchema>;
// TODO: ADD LOGO OF OUR PRODUCT ON THIS PAGE
/**
 * Public invite landing (`/invite/accept?token=…`). Previews the invite, then
 * branches: an existing logged-in invitee accepts in one click; a brand-new
 * email signs up inline (email already proven by the token) and is logged in.
 */
export function AcceptInvitePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const currentEmail = useAuthStore((s) => s.user?.email);
  const setSession = useAuthStore((s) => s.setSession);

  const { data: preview, isLoading, isError } = useInvitePreview(token);
  const accept = useAcceptInvite(token);
  const claim = useClaimInvite(token);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClaimValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: { fullName: '', password: '' },
  });

  if (!token || isError) return <InviteError message={t('invite.invalid')} />;
  if (isLoading || !preview) {
    return (
      <Shell>
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </Shell>
    );
  }
  if (preview.expired) return <InviteError message={t('invite.expired')} />;

  const heading = t('invite.heading', { workspace: preview.workspaceName });
  const sub = t('invite.subtitle', {
    inviter: preview.inviterName,
    role: t(`roles.${preview.role}`),
  });

  // Existing account → accept (must be logged in as that email).
  if (preview.accountExists) {
    const matched = isAuthed && currentEmail?.toLowerCase() === preview.email;
    return (
      <Shell title={heading} description={sub}>
        {matched ? (
          <CardFooter>
            <Button
              disabled={accept.isPending}
              onClick={() =>
                accept.mutate(undefined, {
                  onSuccess: (r) => {
                    toast.success(t('invite.accepted'));
                    navigate(`/w/${r.slug}`);
                  },
                  onError: (err) => toast.error(err),
                })
              }
            >
              {accept.isPending && <Spinner />}
              {t('invite.acceptCta', { workspace: preview.workspaceName })}
            </Button>
          </CardFooter>
        ) : (
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {t('invite.logInAs', { email: preview.email })}
            </p>
            <Button asChild variant="outline" className="w-fit">
              <Link to="/login">{t('invite.goToLogin')}</Link>
            </Button>
          </CardContent>
        )}
      </Shell>
    );
  }

  // Brand-new email → inline signup (claim).
  const onClaim = (v: ClaimValues) =>
    claim.mutate(v, {
      onSuccess: (r) => {
        setSession(r);
        toast.success(t('invite.accepted'));
        navigate(`/w/${r.slug}`);
      },
      onError: (err) => toast.error(err),
    });

  return (
    <Shell title={heading} description={sub}>
      <form onSubmit={handleSubmit(onClaim)}>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            {t('invite.createAccountFor', { email: preview.email })}
          </p>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="claim-name">{t('invite.fullName')}</FieldLabel>
            <Input
              id="claim-name"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
            {errors.fullName ? (
              <FieldError errors={[{ message: t(errors.fullName.message!) }]} />
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="claim-password">
              {t('invite.password')}
            </FieldLabel>
            <Input
              id="claim-password"
              type="password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password ? (
              <FieldError errors={[{ message: t(errors.password.message!) }]} />
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={claim.isPending}>
            {claim.isPending && <Spinner />}
            {t('invite.joinCta', { workspace: preview.workspaceName })}
          </Button>
        </CardFooter>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-svh max-w-md items-center px-4">
      <Card className="w-full">
        {title ? (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </CardHeader>
        ) : null}
        {children}
      </Card>
    </div>
  );
}

function InviteError({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <Shell title={t('invite.invalidTitle')}>
      <CardContent>
        <p className="text-muted-foreground text-sm">{message}</p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link to="/login">{t('invite.goToLogin')}</Link>
        </Button>
      </CardFooter>
    </Shell>
  );
}

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { InfoTip } from '@/components/shared/info-tip';
import { useAvailableServices } from '@/api/hooks/use-services';
import { useCreateWorkspace } from '@/api/hooks/use-workspaces';
import { toast } from '@/lib/toast';
import { isApiError } from '@/types/error';

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'validation.workspaceNameMin')
    .max(120, 'validation.workspaceNameMax'),
});
type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

/** Client-side PREVIEW of the server's slug (the server stays authoritative). */
function slugPreview(name: string): string {
  return (
    name
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'workspace'
  );
}

/**
 * Minimal creation wizard (/services/:key/new): name only — country/currency
 * are locked from the verified mobile, plan is FREE. Paid plans (and the cap
 * lift) arrive with billing; until then the server's PLAN_LIMIT_REACHED is
 * surfaced as an upgrade nudge.
 */
export function CreateWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { serviceKey } = useParams();
  const { data: services, isLoading } = useAvailableServices();
  const create = useCreateWorkspace(serviceKey ?? '');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateWorkspaceValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '' },
  });
  const name = useWatch({ control, name: 'name' }) ?? '';

  const service = services?.find((s) => s.key === serviceKey);
  if (!isLoading && !service) {
    // Unknown/unavailable service in the URL — nothing to create here.
    return <Navigate to="/services" replace />;
  }

  const onSubmit = (values: CreateWorkspaceValues) => {
    create.mutate(
      { name: values.name },
      {
        onSuccess: (ws) => {
          toast.success(t('createWorkspace.success', { name: ws.name }));
          void navigate(`/w/${ws.slug}`, { replace: true });
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const limitReached =
    isApiError(create.error) && create.error.code === 'PLAN_LIMIT_REACHED';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Link
        to="/services"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t('createWorkspace.back')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('createWorkspace.title', { service: service?.name ?? '' })}
          </CardTitle>
          <CardDescription>{t('createWorkspace.subtitle')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="name" className="flex items-center gap-1.5">
                {t('createWorkspace.nameLabel')}
                <InfoTip content={t('createWorkspace.nameHint')} />
              </FieldLabel>
              <Input
                id="name"
                autoFocus
                placeholder={t('createWorkspace.namePlaceholder')}
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              <FieldError
                errors={errors.name && [{ message: t(errors.name.message!) }]}
              />
              {name.trim().length >= 2 && (
                <p className="text-muted-foreground text-xs" dir="ltr">
                  {t('createWorkspace.slugPreview')}{' '}
                  <span className="font-mono">/w/{slugPreview(name)}</span>
                </p>
              )}
            </Field>

            {limitReached && (
              <div className="border-destructive/30 bg-destructive/5 text-foreground flex items-start gap-2 rounded-md border p-3 text-sm">
                <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
                <p>{t('createWorkspace.limitReached')}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={create.isPending || isLoading}
            >
              {create.isPending && <Spinner />}
              {t('createWorkspace.submit')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

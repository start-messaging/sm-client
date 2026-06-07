import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useLogin } from '@/api/hooks/use-auth';
import { toast } from '@/lib/toast';
import { loginSchema, type LoginValues } from './schemas';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginValues) => {
    login.mutate(values, {
      onSuccess: () => {
        toast.success(t('auth.login.success'));
        // Honour ?redirect= set by the auth guard; default to the dashboard.
        void navigate(params.get('redirect') || '/', { replace: true });
      },
      onError: (err) => toast.error(err),
    });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.login.title')}</CardTitle>
        <CardDescription>{t('auth.login.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="email">{t('auth.login.email')}</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError
              errors={errors.email && [{ message: t(errors.email.message!) }]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">
              {t('auth.login.password')}
            </FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <FieldError
              errors={
                errors.password && [{ message: t(errors.password.message!) }]
              }
            />
          </Field>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending && <Spinner />}
            {t('auth.login.submit')}
          </Button>
          <p className="text-muted-foreground text-sm">
            {t('auth.login.noAccount')}{' '}
            <Link to="/signup" className="text-primary hover:underline">
              {t('auth.login.signupLink')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

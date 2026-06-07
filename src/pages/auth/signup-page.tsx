import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
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
import { useSignup } from '@/api/hooks/use-auth';
import { toast } from '@/lib/toast';
import { signupSchema, type SignupValues } from './schemas';

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signup = useSignup();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = (values: SignupValues) => {
    signup.mutate(
      {
        email: values.email,
        password: values.password,
        fullName: values.fullName || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(t('auth.signup.success'));
          // Carry the verificationToken + email to the OTP step via query params.
          const params = new URLSearchParams({
            token: res.verificationToken,
            email: values.email,
          });
          void navigate(`/verify-otp?${params.toString()}`);
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.signup.title')}</CardTitle>
        <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="fullName">
              {t('auth.signup.fullName')}
            </FieldLabel>
            <Input
              id="fullName"
              autoComplete="name"
              {...register('fullName')}
            />
            <FieldError
              errors={
                errors.fullName && [{ message: t(errors.fullName.message!) }]
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">{t('auth.signup.email')}</FieldLabel>
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
              {t('auth.signup.password')}
            </FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
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
          <Button type="submit" className="w-full" disabled={signup.isPending}>
            {signup.isPending && <Spinner />}
            {t('auth.signup.submit')}
          </Button>
          <p className="text-muted-foreground text-sm">
            {t('auth.signup.haveAccount')}{' '}
            <Link to="/login" className="text-primary hover:underline">
              {t('auth.signup.loginLink')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

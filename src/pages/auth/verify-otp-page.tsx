import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
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
import { useVerifyOtp } from '@/api/hooks/use-auth';
import { toast } from '@/lib/toast';
import { verifyOtpSchema, type VerifyOtpValues } from './schemas';

// The token + email arrive via the URL (?token=…&email=…), set by the signup
// step. Validate them up front; a malformed/missing pair → back to signup.
const paramsSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export function VerifyOtpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const parsed = paramsSchema.safeParse({
    token: search.get('token') ?? '',
    email: search.get('email') ?? '',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpValues>({ resolver: zodResolver(verifyOtpSchema) });

  const verify = useVerifyOtp();

  if (!parsed.success) return <Navigate to="/signup" replace />;
  const { token, email } = parsed.data;

  const onSubmit = (values: VerifyOtpValues) => {
    verify.mutate(
      { verificationToken: token, code: values.code },
      {
        onSuccess: () => {
          toast.success(t('auth.verifyOtp.success'));
          void navigate('/', { replace: true });
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.verifyOtp.title')}</CardTitle>
        <CardDescription>
          {t('auth.verifyOtp.subtitle', { email })}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="code">{t('auth.verifyOtp.code')}</FieldLabel>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={!!errors.code}
              {...register('code')}
            />
            <FieldError
              errors={errors.code && [{ message: t(errors.code.message!) }]}
            />
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={verify.isPending}>
            {verify.isPending && <Spinner />}
            {t('auth.verifyOtp.submit')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

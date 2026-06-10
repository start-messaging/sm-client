import { useEffect, useState } from 'react';
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
import { OnboardingStepper } from '@/components/shared/onboarding-stepper';
import { OtpCard } from '@/components/shared/otp-card';
import { useResendOtp, useSignup, useVerifyOtp } from '@/api/hooks/use-auth';
import { useCountdown } from '@/hooks/use-countdown';
import { maskEmail } from '@/lib/mask';
import { toast } from '@/lib/toast';
import { restoredCooldownSec, signupWizardStore } from '@/lib/wizard-storage';
import { isApiError } from '@/types/error';
import { isOtpCooldownDetails, type OtpIssueResult } from '@/types/api';
import { signupSchema, type SignupValues } from './schemas';

interface EmailStep {
  verificationToken: string;
  email: string;
  /** Seed for the resend countdown; 0 when restored (server re-seeds via 429). */
  cooldownSec: number;
  /** True when this step came from persisted state (reload / login recovery). */
  resumed: boolean;
}

/**
 * Registration steps 1–2 (basic info → email OTP) on one page; the token never
 * touches the URL. In-flight state is mirrored to per-tab sessionStorage (with
 * the OTP's own TTL) so a reload — or a login that hits USER_NOT_VERIFIED —
 * resumes at the verify step instead of dead-ending. Step 2 success issues the
 * session and hands over to the authenticated onboarding route for steps 3–4.
 */
export function SignupPage() {
  const [emailStep, setEmailStep] = useState<EmailStep | null>(() => {
    const persisted = signupWizardStore.load();
    return persisted
      ? {
          verificationToken: persisted.verificationToken,
          email: persisted.destination,
          cooldownSec: restoredCooldownSec(persisted),
          resumed: true,
        }
      : null;
  });

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <OnboardingStepper current={emailStep ? 2 : 1} />
      {emailStep ? (
        <VerifyEmailStep
          step={emailStep}
          onTokenChange={(verificationToken) =>
            setEmailStep({ ...emailStep, verificationToken })
          }
          onChangeEmail={() => {
            signupWizardStore.clear();
            setEmailStep(null);
          }}
        />
      ) : (
        <DetailsStep onDone={setEmailStep} />
      )}
    </div>
  );
}

function DetailsStep({ onDone }: { onDone: (next: EmailStep) => void }) {
  const { t } = useTranslation();
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
        fullName: values.fullName,
      },
      {
        onSuccess: (res) => {
          // Also a RESUME: an unverified email re-signup returns 201 with a
          // token (the server overwrote the stale claim) — same handling.
          toast.success(t('auth.signup.success'));
          signupWizardStore.save(
            {
              destination: values.email,
              verificationToken: res.verificationToken,
              resendAvailableAt: Date.now() + res.resendCooldownSec * 1000,
            },
            res.expiresInSec * 1000,
          );
          onDone({
            verificationToken: res.verificationToken,
            email: values.email,
            cooldownSec: res.resendCooldownSec,
            resumed: false,
          });
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <Card className="w-full">
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

function VerifyEmailStep({
  step,
  onTokenChange,
  onChangeEmail,
}: {
  step: EmailStep;
  onTokenChange: (verificationToken: string) => void;
  onChangeEmail: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const { secondsLeft, start } = useCountdown();

  // Seed the resend countdown once from the issuing response. A restored step
  // starts at 0 — if the server is still cooling down, its 429 re-seeds it.
  const initialCooldown = step.cooldownSec;
  useEffect(() => {
    if (initialCooldown > 0) start(initialCooldown);
  }, [initialCooldown, start]);

  const applyReissue = (res: OtpIssueResult) => {
    signupWizardStore.save(
      {
        destination: step.email,
        verificationToken: res.verificationToken,
        resendAvailableAt: Date.now() + res.resendCooldownSec * 1000,
      },
      res.expiresInSec * 1000,
    );
    onTokenChange(res.verificationToken);
    start(res.resendCooldownSec);
    toast.success(t('otp.resent'));
  };

  const onResend = () => {
    resend.mutate(
      { verificationToken: step.verificationToken },
      {
        onSuccess: applyReissue,
        onError: (err) => {
          if (isApiError(err) && err.code === 'EMAIL_ALREADY_VERIFIED') {
            // Verified elsewhere (another tab / earlier session) — a benign
            // resolution, not an error: just go log in.
            signupWizardStore.clear();
            toast.info(t('errors.EMAIL_ALREADY_VERIFIED'));
            void navigate('/login', { replace: true });
            return;
          }
          if (
            isApiError(err) &&
            err.code === 'OTP_COOLDOWN' &&
            isOtpCooldownDetails(err.details)
          ) {
            start(err.details.retryAfterSec);
          }
          toast.error(err);
        },
      },
    );
  };

  const onSubmit = (code: string) => {
    verify.mutate(
      { verificationToken: step.verificationToken, code },
      {
        onSuccess: () => {
          toast.success(t('auth.verifyOtp.success'));
          signupWizardStore.clear();
          // Session is live now; the mobile steps run on the authed route. The
          // RequireGuest eject races this navigate — both land on onboarding.
          void navigate('/onboarding/mobile', { replace: true });
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <OtpCard
      // Re-keying on the token clears stale typed digits after a resend.
      key={step.verificationToken}
      title={t('auth.verifyOtp.title')}
      description={
        <>
          {t('auth.verifyOtp.subtitle', {
            email: step.resumed ? maskEmail(step.email) : step.email,
          })}
          {step.resumed && (
            <>
              {' '}
              <span className="text-foreground">
                {t('auth.verifyOtp.resumed')}
              </span>
            </>
          )}
        </>
      }
      submitLabel={t('auth.verifyOtp.submit')}
      isSubmitting={verify.isPending}
      onSubmit={onSubmit}
      resend={{ secondsLeft, isPending: resend.isPending, onResend }}
      secondaryAction={{
        label: t('auth.verifyOtp.changeEmail'),
        onClick: onChangeEmail,
      }}
    />
  );
}

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { OnboardingStepper } from '@/components/shared/onboarding-stepper';
import { OtpCard } from '@/components/shared/otp-card';
import { authApi } from '@/api/auth.api';
import {
  useLogout,
  useSetMobile,
  useVerifyMobileOtp,
} from '@/api/hooks/use-auth';
import { useCountryOptions } from '@/api/hooks/use-countries';
import { useCountdown } from '@/hooks/use-countdown';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast';
import { mobileWizardStore, restoredCooldownSec } from '@/lib/wizard-storage';
import { isApiError } from '@/types/error';
import { isOtpCooldownDetails, type OtpIssueResult } from '@/types/api';
import { CountryCombobox } from './components/country-combobox';
import { fromE164, mobileSchema, toE164, type MobileValues } from './schemas';

interface MobileOtpStep {
  verificationToken: string;
  mobileE164: string;
  /** Seed for the resend countdown; 0 when restored (server re-seeds via 429). */
  cooldownSec: number;
}

/**
 * Registration steps 3–4: mobile number (country picker + national number)
 * → SMS OTP. Lives on the authenticated branch (the session begins at email
 * verification). In-flight state is mirrored to per-tab sessionStorage so a
 * reload resumes the verify step; without it, a pending number on the profile
 * prefills step 3. Once the mobile is verified the user is bounced into the app.
 */
export function OnboardingMobilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useLogout();
  const navigate = useNavigate();
  const [otpStep, setOtpStep] = useState<MobileOtpStep | null>(() => {
    const persisted = mobileWizardStore.load();
    return persisted
      ? {
          verificationToken: persisted.verificationToken,
          mobileE164: persisted.destination,
          cooldownSec: restoredCooldownSec(persisted),
        }
      : null;
  });

  // The mobile got verified some other way (another tab, an earlier session):
  // refresh the profile so the store learns mobileVerified=true and the
  // redirect above fires. Failures surface — never a silent stall.
  const onVerifiedElsewhere = () => {
    mobileWizardStore.clear();
    setOtpStep(null);
    authApi
      .me()
      .then(setUser)
      .catch((err: unknown) => toast.error(err));
  };

  // Already onboarded (incl. just-finished step 4) → into the app.
  if (user?.mobileVerified) return <Navigate to="/" replace />;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <OnboardingStepper current={otpStep ? 4 : 3} />
      {otpStep ? (
        <VerifyMobileStep
          step={otpStep}
          onReissue={(verificationToken, cooldownSec) =>
            setOtpStep({ ...otpStep, verificationToken, cooldownSec })
          }
          onVerifiedElsewhere={onVerifiedElsewhere}
          onChangeNumber={() => {
            mobileWizardStore.clear();
            setOtpStep(null);
          }}
        />
      ) : (
        <MobileStep
          pendingMobile={user?.mobileE164 ?? null}
          onDone={setOtpStep}
          onVerifiedElsewhere={onVerifiedElsewhere}
        />
      )}
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mx-auto text-xs underline-offset-2 hover:underline"
        onClick={() =>
          logout.mutate(undefined, {
            onSettled: () => void navigate('/login', { replace: true }),
          })
        }
      >
        {t('auth.logout')}
      </button>
    </div>
  );
}

function MobileStep({
  pendingMobile,
  onDone,
  onVerifiedElsewhere,
}: {
  /** Unverified number already staged on the profile (resume case) — prefills the form. */
  pendingMobile: string | null;
  onDone: (next: MobileOtpStep) => void;
  onVerifiedElsewhere: () => void;
}) {
  const { t } = useTranslation();
  const { data: countries, isLoading } = useCountryOptions();
  const setMobile = useSetMobile();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MobileValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: (pendingMobile && fromE164(pendingMobile)) || {
      country: '',
      national: '',
    },
  });

  // The prefilled country comes from the phone number; if it isn't among the
  // active picker options (deactivated since, or a shared-calling-code
  // sibling), drop it so the user picks an offered country explicitly.
  const selectedCountry = watch('country');
  useEffect(() => {
    if (!countries || !selectedCountry) return;
    if (!countries.some((c) => c.code === selectedCountry)) {
      setValue('country', '');
    }
  }, [countries, selectedCountry, setValue]);

  const onSubmit = (values: MobileValues) => {
    const mobileE164 = toE164(values);
    setMobile.mutate(
      { mobileE164 },
      {
        onSuccess: (res) => {
          toast.success(t('onboarding.mobile.success'));
          // The code arrives by SMS (console log in dev); the token moves to
          // step 4 in memory + per-tab storage — never via the URL.
          mobileWizardStore.save(
            {
              destination: mobileE164,
              verificationToken: res.verificationToken,
              resendAvailableAt: Date.now() + res.resendCooldownSec * 1000,
            },
            res.expiresInSec * 1000,
          );
          onDone({
            verificationToken: res.verificationToken,
            mobileE164,
            cooldownSec: res.resendCooldownSec,
          });
        },
        onError: (err) => {
          if (isApiError(err) && err.code === 'MOBILE_ALREADY_VERIFIED') {
            // Verified in another tab — benign; refresh and move on.
            toast.info(t('errors.MOBILE_ALREADY_VERIFIED'));
            onVerifiedElsewhere();
            return;
          }
          toast.error(err);
        },
      },
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('onboarding.mobile.title')}</CardTitle>
        <CardDescription>{t('onboarding.mobile.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="country">
              {t('onboarding.mobile.country')}
            </FieldLabel>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <CountryCombobox
                  countries={countries ?? []}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldError
              errors={
                errors.country && [{ message: t(errors.country.message!) }]
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="national">
              {t('onboarding.mobile.number')}
            </FieldLabel>
            <Input
              id="national"
              type="tel"
              dir="ltr"
              autoComplete="tel-national"
              placeholder="98765 43210"
              aria-invalid={!!errors.national}
              {...register('national')}
            />
            <FieldError
              errors={
                errors.national && [{ message: t(errors.national.message!) }]
              }
            />
            <p className="text-muted-foreground text-xs">
              {t('onboarding.mobile.help')}
            </p>
          </Field>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={setMobile.isPending || isLoading}
          >
            {setMobile.isPending && <Spinner />}
            {t('onboarding.mobile.submit')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function VerifyMobileStep({
  step,
  onReissue,
  onVerifiedElsewhere,
  onChangeNumber,
}: {
  step: MobileOtpStep;
  onReissue: (verificationToken: string, cooldownSec: number) => void;
  onVerifiedElsewhere: () => void;
  onChangeNumber: () => void;
}) {
  const { t } = useTranslation();
  const verify = useVerifyMobileOtp();
  const setMobile = useSetMobile();
  const { secondsLeft, start } = useCountdown();

  // Seed the resend countdown once from the issuing response; restored steps
  // start at 0 and rely on the server's 429 to re-seed.
  const initialCooldown = step.cooldownSec;
  useEffect(() => {
    if (initialCooldown > 0) start(initialCooldown);
  }, [initialCooldown, start]);

  const applyReissue = (res: OtpIssueResult) => {
    mobileWizardStore.save(
      {
        destination: step.mobileE164,
        verificationToken: res.verificationToken,
        resendAvailableAt: Date.now() + res.resendCooldownSec * 1000,
      },
      res.expiresInSec * 1000,
    );
    onReissue(res.verificationToken, res.resendCooldownSec);
    start(res.resendCooldownSec);
    toast.success(t('otp.resent'));
  };

  // Resend = re-POST the same number: the server invalidates the old code,
  // re-issues, and re-sends (subject to the cooldown).
  const onResend = () => {
    setMobile.mutate(
      { mobileE164: step.mobileE164 },
      {
        onSuccess: applyReissue,
        onError: (err) => {
          if (isApiError(err) && err.code === 'MOBILE_ALREADY_VERIFIED') {
            // Verified in another tab — benign; refresh and move on.
            toast.info(t('errors.MOBILE_ALREADY_VERIFIED'));
            onVerifiedElsewhere();
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
          toast.success(t('onboarding.verifyMobile.success'));
          mobileWizardStore.clear();
          // setUser (in the hook) updates the store → the page redirect fires.
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <OtpCard
      // Re-keying on the token clears stale typed digits after a resend.
      key={step.verificationToken}
      title={t('onboarding.verifyMobile.title')}
      description={
        <>
          <span dir="ltr">{step.mobileE164}</span> —{' '}
          {t('onboarding.verifyMobile.subtitle')}
        </>
      }
      submitLabel={t('onboarding.verifyMobile.submit')}
      isSubmitting={verify.isPending}
      onSubmit={onSubmit}
      resend={{ secondsLeft, isPending: setMobile.isPending, onResend }}
      secondaryAction={{
        label: t('onboarding.mobile.changeNumber'),
        onClick: onChangeNumber,
      }}
    />
  );
}

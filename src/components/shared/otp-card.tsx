import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
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
import { FieldError } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';

const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'validation.codeLength'),
});
type OtpValues = z.infer<typeof otpSchema>;

export interface OtpCardProps {
  title: string;
  description: ReactNode;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (code: string) => void;
  /** Resend affordance with a server-seeded cooldown countdown. */
  resend?: {
    secondsLeft: number;
    isPending: boolean;
    onResend: () => void;
  };
  /** Escape hatch under the form, e.g. "use a different email". */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * The one OTP entry step shared by every verification flow (signup email,
 * onboarding mobile, login recovery). Owns the 6-digit form; the caller owns
 * what "submit" and "resend" actually call.
 */
export function OtpCard({
  title,
  description,
  submitLabel,
  isSubmitting,
  onSubmit,
  resend,
  secondaryAction,
}: OtpCardProps) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpValues>({ resolver: zodResolver(otpSchema) });

  const cooldownActive = (resend?.secondsLeft ?? 0) > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit((values) => onSubmit(values.code))}>
        <CardContent className="flex flex-col items-center gap-2">
          <Controller
            control={control}
            name="code"
            defaultValue=""
            render={({ field }) => (
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                autoComplete="one-time-code"
                dir="ltr"
                value={field.value}
                onChange={field.onChange}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          <FieldError
            errors={errors.code && [{ message: t(errors.code.message!) }]}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {submitLabel}
          </Button>
          {resend && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={cooldownActive || resend.isPending}
              onClick={resend.onResend}
            >
              {resend.isPending && <Spinner />}
              {cooldownActive
                ? t('otp.resendIn', { seconds: resend.secondsLeft })
                : t('otp.resend')}
            </Button>
          )}
          {secondaryAction && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

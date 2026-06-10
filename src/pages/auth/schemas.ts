import { z } from 'zod';

/**
 * Form schemas for the auth pages (login / signup / verify-otp). Mirror the
 * backend DTO constraints (sm-server auth DTOs) so the client rejects bad input
 * before a request goes out. Messages are i18n keys resolved at render time.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'validation.emailRequired')
    .email('validation.emailInvalid'),
  password: z.string().min(1, 'validation.passwordRequired'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  // Server SignupDto requires fullName (MinLength 1) and caps password at 72
  // (Argon2 input limit) — mirror both so failures are field-level, not toasts.
  fullName: z
    .string()
    .trim()
    .min(1, 'validation.fullNameRequired')
    .max(120, 'validation.fullNameMax'),
  email: z
    .string()
    .min(1, 'validation.emailRequired')
    .email('validation.emailInvalid'),
  password: z
    .string()
    .min(8, 'validation.passwordMin')
    .max(72, 'validation.passwordMax'),
});
export type SignupValues = z.infer<typeof signupSchema>;

// The 6-digit OTP schema lives inside components/shared/otp-card.tsx — the
// form is intrinsic to that shared step component.

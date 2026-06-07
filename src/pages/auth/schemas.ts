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
  fullName: z.string().trim().max(120).optional(),
  email: z
    .string()
    .min(1, 'validation.emailRequired')
    .email('validation.emailInvalid'),
  password: z.string().min(8, 'validation.passwordMin').max(128),
});
export type SignupValues = z.infer<typeof signupSchema>;

export const verifyOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'validation.codeLength'),
});
export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;

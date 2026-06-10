import { z } from 'zod';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

/**
 * Step 3: country picker + national number. Validated together — the pair must
 * form a real number for the chosen country (libphonenumber `/min`; the server
 * re-validates with `/max` authoritatively and derives the country itself).
 */
export const mobileSchema = z
  .object({
    country: z.string().length(2, 'validation.countryRequired'),
    national: z.string().trim().min(1, 'validation.mobileRequired'),
  })
  .superRefine((values, ctx) => {
    const parsed = parsePhoneNumberFromString(
      values.national,
      values.country as CountryCode,
    );
    if (!parsed || !parsed.isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['national'],
        message: 'validation.mobileInvalid',
      });
    }
  });
export type MobileValues = z.infer<typeof mobileSchema>;

/** Combine the validated picker+number pair into canonical E.164. */
export function toE164(values: MobileValues): string {
  return parsePhoneNumberFromString(
    values.national,
    values.country as CountryCode,
  )!.number;
}

/**
 * Split a stored E.164 back into picker+number form — prefills step 3 when the
 * profile already holds a pending (unverified) mobile, so resuming users only
 * confirm instead of retyping.
 */
export function fromE164(e164: string): MobileValues | null {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed?.country) return null;
  return { country: parsed.country, national: parsed.nationalNumber };
}

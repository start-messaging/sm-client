import i18n from '@/lib/i18n';
import { isApiError } from '@/types/error';

/**
 * Turn any thrown value into a user-facing, localized message. Looks up the
 * backend error code under the `errors.*` i18n namespace; falls back to the
 * server-provided message, then a generic string. Keep new backend codes in
 * sync with the `errors` block of each locale file.
 */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 0) return i18n.t('errors.network');
    const key = `errors.${error.code}`;
    const translated = i18n.t(key);
    if (translated !== key) return translated; // i18next returns the key if missing
    return error.message || i18n.t('errors.unknown');
  }
  if (error instanceof Error) return error.message;
  return i18n.t('errors.unknown');
}

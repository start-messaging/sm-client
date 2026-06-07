/**
 * Supported UI languages. To add one: add an entry here and a matching locale
 * file under src/locales/<code>/translation.json. `dir` drives <html dir> for
 * RTL scripts (e.g. Arabic).
 */
export interface LanguageDef {
  code: string;
  label: string; // shown in the switcher, in its own script
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: readonly LanguageDef[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
] as const;

export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function languageDir(code: string): 'ltr' | 'rtl' {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr';
}

/** The URL query param that mirrors the active language, e.g. ?lng=hi */
export const LANG_QUERY_PARAM = 'lng';

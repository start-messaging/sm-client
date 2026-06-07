import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  DEFAULT_LANGUAGE,
  LANG_QUERY_PARAM,
  SUPPORTED_LANGUAGE_CODES,
  languageDir,
} from '@/config/languages';
import { storageKey } from '@/config/app';

// Eagerly bundle the locale resources — they're tiny, so bundling avoids a
// network round-trip on first paint. Swap to lazy http-backend if they grow.
import en from '@/locales/en/translation.json';
import hi from '@/locales/hi/translation.json';
import ar from '@/locales/ar/translation.json';

/**
 * Language resolution order: when the user has NO stored preference, fall back to
 * the browser's language so they see the app in their own language immediately.
 *   1. ?lng= URL query param   (shareable / deep-linkable)
 *   2. localStorage            (their last explicit choice)
 *   3. navigator.language      (browser / OS language)
 *   4. DEFAULT_LANGUAGE
 *
 * NOTE: `caches` may only contain detectors that implement `cacheUserLanguage`
 * — that's `localStorage` / `cookie`, NOT `querystring`. So we persist to
 * localStorage and mirror the choice into ?lng= ourselves (see syncUrlLang).
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ar: { translation: ar },
    },
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    fallbackLng: DEFAULT_LANGUAGE,
    nonExplicitSupportedLngs: true, // 'en-US' → 'en'
    load: 'languageOnly',
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: LANG_QUERY_PARAM,
      lookupLocalStorage: storageKey('lang'),
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already escapes
    returnNull: false,
  });

/** Keep <html lang> and <html dir> in sync (RTL support). */
function syncHtmlAttributes(lng: string) {
  const root = document.documentElement;
  root.setAttribute('lang', lng);
  root.setAttribute('dir', languageDir(lng));
}

/** Mirror the active language into ?lng= (without a navigation). */
function syncUrlLang(lng: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get(LANG_QUERY_PARAM) !== lng) {
    url.searchParams.set(LANG_QUERY_PARAM, lng);
    window.history.replaceState(window.history.state, '', url);
  }
}

function onLanguage(lng: string) {
  syncHtmlAttributes(lng);
  syncUrlLang(lng);
}

onLanguage(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE);
i18n.on('languageChanged', onLanguage);

export default i18n;

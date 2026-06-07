/**
 * Per-app identity constants — brand name + storage namespace. This is the ONE
 * file the two apps (sm-client / sm-admin) differ on; everything else is shared.
 *
 * - `APP_NAME`  : the canonical (English) brand string. Use it ONLY where i18n
 *   can't run — the document <title> and other non-React contexts. In the UI,
 *   render `t('common.appName')` instead so the name reads in the user's language.
 * - `APP_ID`    : storage namespace. Every localStorage key (auth, theme, lang)
 *   derives from it, so stores/i18n stay byte-identical across apps yet never
 *   collide if both ever share an origin.
 */
export const APP_NAME = 'Messaging Platform';

export const APP_ID = 'sm-client';

/** Build a namespaced localStorage key, e.g. storageKey('theme') → 'sm-client-theme'. */
export const storageKey = (name: string) => `${APP_ID}-${name}`;

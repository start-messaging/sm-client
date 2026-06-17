/**
 * Compile-time drift guard — runs under `npm run typecheck` (the SPAs have no
 * test runner, and this needs none). It asserts every server-code key in this
 * app's `errors.*` i18n catalogue is a real `ErrorCode`. If a translation key is
 * a typo or a retired code, `Orphan` resolves to that key (not `never`) and the
 * assignment below fails to compile, naming the offending key.
 *
 * This guards the direction that actually breaks the UI silently — a catalogue
 * key that matches no real code. It intentionally does NOT require every code to
 * be translated: a missing key degrades gracefully through `errorMessage()`
 * (server message → `errors.unknown`), and forcing this English-or-customer app
 * to translate codes it never surfaces would be noise.
 *
 * This file is imported by nothing at runtime (so it adds nothing to the bundle)
 * but `tsc` still type-checks it because it lives under `src`.
 */
import en from '@/locales/en/translation.json';
import type { ErrorCode } from './error-codes';

/** Non-code keys under `errors.*`: transport/unknown sentinels + the panel heading. */
type Sentinel = 'network' | 'unknown' | 'title';

type CatalogueCode = Exclude<keyof typeof en.errors, Sentinel>;
type Orphan = Exclude<CatalogueCode, ErrorCode>;

// If this line errors with "Type 'true' is not assignable to type '<CODE>'",
// then <CODE> is a key under errors.* that is NOT in ERROR_CODES — either fix the
// typo, add the code to error-codes.ts, or delete the stale translation.
export const _noOrphanErrorCodes: [Orphan] extends [never] ? true : Orphan =
  true;

import { storage } from '@/lib/storage';

/**
 * Per-tab persistence for in-flight OTP wizard steps, so a reload resumes the
 * step instead of dead-ending the user. Backed by storage.session with a TTL
 * sized to the server-reported OTP lifetime — stale state self-evicts exactly
 * when the code dies.
 *
 * INVARIANT: only the destination (email / E.164) and the verification token
 * are ever stored. Passwords are NEVER persisted, anywhere, in any form.
 */
export interface OtpWizardState {
  /** Where the code went: the email address or the E.164 mobile number. */
  destination: string;
  verificationToken: string;
  /**
   * Epoch ms when resend becomes available (now + server resendCooldownSec at
   * save time) — restores keep the resend button correctly disabled.
   */
  resendAvailableAt?: number;
}

/** Fallback when a response doesn't carry `expiresInSec` (server default: 10 min). */
export const DEFAULT_OTP_TTL_MS = 10 * 60_000;

function createWizardStore(key: string) {
  return {
    load(): OtpWizardState | null {
      return storage.session.get<OtpWizardState>(key);
    },
    save(state: OtpWizardState, ttlMs: number = DEFAULT_OTP_TTL_MS): void {
      // Guard the TTL: NaN/0/negative would make the entry immortal or dead.
      const safeTtl =
        Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_OTP_TTL_MS;
      storage.session.set(key, state, safeTtl);
    },
    clear(): void {
      storage.session.remove(key);
    },
  } as const;
}

/** Seconds of resend cooldown left for a restored state (0 = available now). */
export function restoredCooldownSec(state: OtpWizardState): number {
  if (!state.resendAvailableAt) return 0;
  return Math.max(0, Math.ceil((state.resendAvailableAt - Date.now()) / 1000));
}

/** Signup steps 1–2: the email-OTP step (also fed by login recovery). */
export const signupWizardStore = createWizardStore('signup-email-otp');

/** Onboarding steps 3–4: the mobile-OTP step. */
export const mobileWizardStore = createWizardStore('onboarding-mobile-otp');

/**
 * Wipe ALL wizard state. Called from auth.store.clear() (logout / hard auth
 * failure): the next person on this tab must never resume — or resend to —
 * a previous user's destination.
 */
export function clearWizardStores(): void {
  signupWizardStore.clear();
  mobileWizardStore.clear();
}

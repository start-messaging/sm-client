import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConversationAnalyticsSnapshot {
  month: string;
  marketing: number;
  utility: number;
  authentication: number;
  service: number;
  total: number;
}

export type WabaStatus = 'connected' | 'disconnected' | 'not_connected';

export interface WabaConnectionStatus {
  status: WabaStatus;
  /** Display name registered on the WABA, if connected. */
  displayName: string | null;
  /** Phone number registered on the WABA, if connected. */
  phoneNumber: string | null;
  /**
   * Whether Meta has confirmed a valid payment method on the WABA.
   * `null` means unknown (no payment webhook received yet).
   */
  metaPaymentReady: boolean | null;
  wabaId: string | null;
  /** True when WABA is linked but phone is not yet Cloud API registered. */
  phoneRegistrationPending: boolean;
  /** Meta WABA-level app-review status, e.g. 'APPROVED' | 'PENDING' | 'REJECTED'. */
  accountReviewStatus: string | null;
  /** Meta Business Manager verification state. */
  businessVerificationStatus: string | null;
  /** Daily business-initiated conversation cap for this phone number. */
  messagingLimitPerDay: number | null;
  /** Per-number quality rating from Meta: GREEN | YELLOW | RED | UNKNOWN. */
  qualityRating: string | null;
  /** Meta display-name review state: APPROVED | PENDING_REVIEW | DECLINED. */
  displayNameStatus: string | null;
  /** Current-month Meta billing breakdown. Null until first sync after connect. */
  conversationAnalytics: ConversationAnalyticsSnapshot | null;
}

export interface ConnectWhatsAppBody {
  /** The code returned by the Facebook JS SDK Embedded Signup callback. */
  code: string;
  /** WABA ID captured from the ES v4 sessionInfo window message (best-effort). */
  wabaId?: string;
  /** Phone number ID captured from the ES v4 sessionInfo window message (best-effort). */
  phoneNumberId?: string;
  /** 2-step verification PIN — optional at connect; use register-phone if pending. */
  pin?: string;
}

export interface ConnectWhatsAppResult {
  wabaAccountId: string;
  phoneNumberId: string;
  displayNumber: string;
  phoneRegistrationPending: boolean;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const whatsappApi = {
  getStatus: (slug: string) =>
    apiGet<WabaConnectionStatus>(endpoints.whatsapp.status(slug)),

  connect: (slug: string, body: ConnectWhatsAppBody) =>
    apiPost<ConnectWhatsAppResult>(endpoints.whatsapp.connect(slug), body),

  registerPhone: (slug: string, pin: string) =>
    apiPost<{ registered: true; displayNumber: string }>(
      endpoints.whatsapp.registerPhone(slug),
      { pin },
    ),

  /** Pull WABA/phone state from Meta (missed-webhook escape hatch). */
  sync: (slug: string) =>
    apiPost<WabaConnectionStatus>(endpoints.whatsapp.sync(slug), {}),

  disconnect: (slug: string) =>
    apiPost<void>(endpoints.whatsapp.disconnect(slug), {}),
};

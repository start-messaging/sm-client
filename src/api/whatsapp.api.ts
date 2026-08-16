import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type WabaStatus = 'connected' | 'disconnected' | 'not_connected';

export interface WabaConnectionStatus {
  status: WabaStatus;
  /** Display name registered on the WABA, if connected. */
  displayName: string | null;
  /** Phone number registered on the WABA, if connected. */
  phoneNumber: string | null;
  /**
   * Whether Meta has confirmed a valid payment method on the WABA.
   * `null` means unknown (best-effort probe; always handle send-time errors).
   */
  metaPaymentReady: boolean | null;
  wabaId: string | null;
  /** True when WABA is linked but phone is not yet Cloud API registered. */
  phoneRegistrationPending: boolean;
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

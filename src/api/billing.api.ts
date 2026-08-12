import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

// ── Types ──────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'none';

export interface CrmSubscription {
  status: SubscriptionStatus;
  planCode: string;
  /** ISO date string when the current billing period ends. */
  currentPeriodEnd: string | null;
  /** ISO date string when the trial ends, if trialing. */
  trialEnd: string | null;
  /** Razorpay subscription ID for the customer portal link. */
  razorpaySubscriptionId: string | null;
}

export interface BillingPlan {
  code: string;
  name: string;
  /** Monthly price in smallest currency unit (paise for INR). */
  priceMicros: string;
  currency: string;
  features: Record<string, boolean | string>;
  limits: Record<string, number | null>;
}

export interface CheckoutResult {
  /** URL to redirect the customer to for Razorpay hosted payment. */
  checkoutUrl: string;
}

export interface CreateCheckoutBody {
  planCode: string;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const billingApi = {
  getSubscription: (slug: string) =>
    apiGet<CrmSubscription>(endpoints.billing.subscription(slug)),

  listPlans: (slug: string) =>
    apiGet<BillingPlan[]>(endpoints.billing.plans(slug)),

  createCheckout: (slug: string, body: CreateCheckoutBody) =>
    apiPost<CheckoutResult>(endpoints.billing.checkout(slug), body),
};

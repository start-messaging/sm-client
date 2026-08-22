import type { TemplateCategory, TemplateComponent } from '@/api/templates.api';

/**
 * Curated Meta-compliant starter recipes (local only).
 * Meta does not publish a Graph API of “all Facebook examples” for partners —
 * competitors ship a similar recipe library. Applying an example only prefills
 * our create form; nothing is submitted until the user clicks Submit to Meta.
 */
export interface TemplateExample {
  /** Stable gallery id (not sent to Meta). */
  id: string;
  /** Suggested snake_case name — user can edit before submit. */
  suggestedName: string;
  category: TemplateCategory;
  /** Default language for the recipe. */
  language: string;
  components: TemplateComponent[];
  /** Short “when to use” tip. */
  useWhen: string;
  /** Rejection / compliance tip. */
  metaTip: string;
}

export const TEMPLATE_EXAMPLES: TemplateExample[] = [
  // ── Utility ───────────────────────────────────────────────────────────────
  {
    id: 'hello_world',
    // Not `hello_world` — Meta reserves that as a default sample (subcode 2388155).
    suggestedName: 'welcome_greeting',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, thanks for connecting with us on WhatsApp. How can we help you today?',
      },
    ],
    useWhen: 'First smoke-test after Cloud API connect — simple greeting.',
    metaTip:
      'Do not use the name hello_world — Meta already created that sample on every WABA. Keep copy transactional.',
  },
  {
    id: 'order_update',
    suggestedName: 'order_update',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, your order {{2}} is now {{3}}. Track updates anytime in your account.',
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to opt out of order updates.',
      },
    ],
    useWhen: 'Ecommerce order status (confirmed, shipped, delivered).',
    metaTip:
      'Utility must match a user-requested update. Don’t add discounts here.',
  },
  {
    id: 'appointment_reminder',
    suggestedName: 'appointment_reminder',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, reminder: your appointment is on {{2}} at {{3}}. Reply YES to confirm or call us to reschedule.',
      },
    ],
    useWhen:
      'Clinics, salons, service bookings — reminder of an existing appointment.',
    metaTip:
      'Must refer to an appointment the customer already has; avoid sales pitches.',
  },
  {
    id: 'payment_reminder',
    suggestedName: 'payment_reminder',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, this is a reminder that invoice {{2}} for {{3}} is due on {{4}}. Pay securely via your usual channel.',
      },
    ],
    useWhen: 'Invoice / dues reminder the customer already owes.',
    metaTip:
      'Don’t bundle unrelated offers — that often gets categorized as Marketing.',
  },
  {
    id: 'shipping_update',
    suggestedName: 'shipping_update',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, your package {{2}} is out for delivery today. Expected by {{3}}.',
      },
    ],
    useWhen: 'Logistics / delivery ETA for an existing shipment.',
    metaTip: 'Stick to delivery facts; keep branding light.',
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    id: 'promo_offer',
    suggestedName: 'promo_offer',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Special offer',
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, enjoy {{2}} off until {{3}}. Use code {{4}} at checkout. Reply STOP to opt out.',
      },
      {
        type: 'FOOTER',
        text: 'Terms apply. Opt out anytime.',
      },
    ],
    useWhen: 'Sales, discounts, seasonal campaigns to opted-in customers.',
    metaTip:
      'Always include clear opt-out. Marketing is reviewed more strictly than Utility.',
  },
  {
    id: 'new_arrival',
    suggestedName: 'new_arrival',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, {{2}} just dropped. Explore what’s new and shop today. Reply STOP to unsubscribe.',
      },
    ],
    useWhen: 'Product launch or catalogue “what’s new” blasts.',
    metaTip:
      'Recipients must have opted in to marketing. Avoid misleading urgency.',
  },
  {
    id: 'feedback_request',
    suggestedName: 'feedback_request',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, thanks for choosing us! How was your experience with {{2}}? Reply with a rating from 1–5. Reply STOP to opt out.',
      },
    ],
    useWhen: 'Post-purchase feedback / NPS style asks.',
    metaTip:
      'If it’s only transactional survey after a purchase, Utility may fit better — pick category carefully.',
  },

  // ── Authentication ────────────────────────────────────────────────────────
  {
    id: 'otp_verification',
    suggestedName: 'otp_verification',
    category: 'AUTHENTICATION',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Your verification code is {{1}}. It expires in {{2}} minutes. Do not share this code with anyone.',
      },
    ],
    useWhen: 'Login / signup OTP when the user requested a code.',
    metaTip:
      'Meta often requires the official AUTHENTICATION + OTP button format. If rejected, recreate as Auth OTP in WhatsApp Manager or extend our builder later.',
  },
];

export function examplesByCategory(
  category: TemplateCategory | 'ALL',
): TemplateExample[] {
  if (category === 'ALL') return TEMPLATE_EXAMPLES;
  return TEMPLATE_EXAMPLES.filter((e) => e.category === category);
}

export function exampleBodyPreview(example: TemplateExample): string {
  return (
    example.components.find((c) => c.type === 'BODY')?.text ??
    example.components
      .map((c) => c.text)
      .filter(Boolean)
      .join(' ')
  );
}

/** 3–4 cards for the templates home: prefer Utility, include one Marketing. */
export function featuredExamples(
  examples: TemplateExample[],
  limit = 4,
): TemplateExample[] {
  const utility = examples.filter((e) => e.category === 'UTILITY');
  const marketing = examples.filter((e) => e.category === 'MARKETING');
  const picked: TemplateExample[] = [];
  for (const e of utility) {
    if (picked.length >= Math.min(3, limit)) break;
    picked.push(e);
  }
  if (picked.length < limit && marketing[0]) picked.push(marketing[0]);
  for (const e of examples) {
    if (picked.length >= limit) break;
    if (!picked.includes(e)) picked.push(e);
  }
  return picked.slice(0, limit);
}

/**
 * Money helpers. The platform stores every amount as an integer number of
 * **micros** (1 currency unit = 1,000,000 micros) plus a currency code — never
 * floats. These pure functions convert between micros and display/input
 * decimals and compute margins. Shared byte-identical between sm-admin and
 * sm-client.
 */

/** Micros per one whole currency unit. */
export const MICROS_PER_UNIT = 1_000_000;

/**
 * Per-message rates are often sub-cent (e.g. $0.0079), so rate displays use at
 * least this many fraction digits regardless of the currency's normal precision.
 */
export const MIN_RATE_DECIMALS = 4;

/** Display fraction digits for a per-message rate in a given currency. */
export function rateDecimals(currencyDecimalPlaces: number): number {
  return Math.max(currencyDecimalPlaces, MIN_RATE_DECIMALS);
}

/** Format micros as a display string (with optional symbol). Null → em dash. */
export function formatMicros(
  micros: number | null,
  decimals: number,
  symbol?: string,
): string {
  if (micros === null) return '—';
  const value = micros / MICROS_PER_UNIT;
  const text = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return symbol ? `${symbol}${text}` : text;
}

/** Micros → a plain editable decimal string (no separators). Null → ''. */
export function microsToInput(micros: number | null, decimals: number): string {
  if (micros === null) return '';
  return (micros / MICROS_PER_UNIT).toFixed(decimals);
}

/**
 * Parse a user-typed decimal into integer micros. Empty string → null
 * ("unpriced"); anything not a finite, non-negative number → null (callers
 * should validate before relying on a non-null result).
 */
export function inputToMicros(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * MICROS_PER_UNIT);
}

/** True when a string is a usable money input (empty = unpriced is allowed). */
export function isValidMoneyInput(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '') return true;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0;
}

/**
 * Gross margin as a 0–1 ratio: (sell − cost) / sell. Null when it can't be
 * computed (no sell, zero sell, or no cost) so the UI shows a neutral dash
 * instead of NaN or a misleading 0%/100%.
 */
export function computeMargin(
  sellMicros: number | null,
  costMicros: number | null,
): number | null {
  if (sellMicros === null || sellMicros === 0 || costMicros === null) {
    return null;
  }
  return (sellMicros - costMicros) / sellMicros;
}

export type MarginTone = 'good' | 'bad';

/** Tone for a margin ratio: any profit (> 0) is good (green); break-even or a
 * loss (≤ 0) is bad (red). */
export function marginTone(margin: number): MarginTone {
  return margin > 0 ? 'good' : 'bad';
}

/** Margin ratio → display percent (rounded). Null → em dash. */
export function formatMargin(margin: number | null): string {
  if (margin === null) return '—';
  return `${Math.round(margin * 100)}%`;
}

/**
 * Format micros as a localized currency string — symbol and decimal places are
 * derived from the ISO 4217 `currency` code via `Intl` (₹1,234.00, ¥1,234, …).
 * For wallet BALANCES (not sub-cent per-message rates): use the currency's
 * natural precision. Accepts micros as a string (balances are high-magnitude
 * and travel as strings) or a number.
 */
export function formatMoney(
  micros: string | number | null,
  currency: string,
): string {
  if (micros === null || micros === '') return '—';
  const value = Number(micros) / MICROS_PER_UNIT;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/** The narrow symbol for an ISO 4217 code (₹, $, ¥); falls back to the code. */
export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

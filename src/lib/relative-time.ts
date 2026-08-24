/**
 * Short relative timestamps for list rows ("2 min", "1 hr", "Mon") — native
 * Intl.RelativeTimeFormat, no date-fns. Falls back to a weekday / short date
 * once the item is old enough that a unit count stops being useful.
 */

function stripAgo(formatted: string): string {
  return formatted.replace(/\s*ago$/i, '').replace(/\.$/, '');
}

export function formatRelativeShort(
  iso: string | null | undefined,
  opts: { locale?: string; nowLabel?: string } = {},
): string {
  if (!iso) return '';
  const { locale, nowLabel = 'now' } = opts;
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return nowLabel;

  const rtf = new Intl.RelativeTimeFormat(locale, { style: 'short' });

  if (diffMin < 60) return stripAgo(rtf.format(-diffMin, 'minute'));

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return stripAgo(rtf.format(-diffHr, 'hour'));

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) {
    return date.toLocaleDateString(locale, { weekday: 'short' });
  }
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

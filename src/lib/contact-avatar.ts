/**
 * Deterministic 2-letter initials + a matching color pair for conversation /
 * contact avatars — no images, no per-contact state. Same input (name or
 * phone) always resolves to the same palette entry so a contact's color is
 * stable across renders, sessions and devices.
 */

const AVATAR_PALETTE: { bg: string; text: string }[] = [
  {
    bg: 'bg-pink-100 dark:bg-pink-950/40',
    text: 'text-pink-700 dark:text-pink-300',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
  },
  {
    bg: 'bg-slate-100 dark:bg-slate-950/40',
    text: 'text-slate-700 dark:text-slate-300',
  },
];

export function getInitials(
  name: string | null | undefined,
  phone: string,
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0]![0] + words[words.length - 1]![0]).toUpperCase();
    }
    return words[0]!.slice(0, 2).toUpperCase();
  }
  const cleaned = phone.replace(/^\+/, '');
  return cleaned.slice(0, 2).toUpperCase() || '••';
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Picks a stable {bg, text} class pair from the fixed 6-color palette. */
export function getAvatarColors(seed: string): { bg: string; text: string } {
  const idx = hashString(seed) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx]!;
}

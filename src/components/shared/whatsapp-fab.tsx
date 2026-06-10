import { useEffect, useState, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORT_WHATSAPP } from '@/config/app';
import { cn } from '@/lib/utils';

/** WhatsApp brand glyph (lucide carries no brand icons). */
function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/** How long the nudge bubble stays before collapsing to the icon alone. */
const NUDGE_VISIBLE_MS = 6000;

/**
 * Floating "ask us on WhatsApp" button, pinned to the bottom corner of every
 * layout. The speech bubble shows on arrival then collapses so it stops eating
 * screen space (hover brings it back on desktop), while the ping halo blinks
 * permanently — that's the deliberate eye-catcher. Opens a
 * prefilled wa.me chat to the configured support number
 * ([SUPPORT_WHATSAPP](../../config/app.ts)). `end-*` keeps it on the visual
 * right in LTR and mirrors for RTL.
 */
export function WhatsAppFab() {
  const { t } = useTranslation();
  const [nudging, setNudging] = useState(true);
  const href = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    t('support.prefill', { appName: t('common.appName') }),
  )}`;

  useEffect(() => {
    const id = window.setTimeout(() => setNudging(false), NUDGE_VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={t('support.cta')}
      className="group fixed bottom-5 end-5 z-50 flex items-center gap-2"
    >
      <span
        className={cn(
          'bg-card text-card-foreground rounded-full border px-4 py-2 text-sm font-medium shadow-lg transition-transform group-hover:-translate-y-0.5',
          !nudging && 'hidden group-hover:inline-block',
        )}
      >
        {t('support.nudge')}
      </span>
      <span className="relative">
        {/* Always-on ping halo — the eye-catcher stays even after the bubble collapses. */}
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
        <span className="relative grid size-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform group-hover:scale-105">
          <WhatsAppIcon className="size-6" />
        </span>
      </span>
    </a>
  );
}

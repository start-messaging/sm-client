import { useTranslation } from 'react-i18next';
import type { TemplateButton } from '@/api/templates.api';
import {
  TemplatePreviewButtons,
  TemplatePreviewMedia,
} from './template-preview-buttons';

interface WaMessagePreviewProps {
  headerText?: string;
  headerMedia?: {
    format: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
    url?: string;
  };
  bodyText?: string;
  footerText?: string;
  templateName?: string;
  buttons?: Array<Pick<TemplateButton, 'type' | 'text' | 'icon'>>;
  /** @deprecated use `buttons` */
  buttonLabels?: string[];
  isCarousel?: boolean;
  carouselCardCount?: number;
}

function renderBodyWithVariables(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{[0-9a-z_]+\}\})/gi);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{([0-9]+|[a-z][a-z0-9_]*)\}\}$/i);
    if (match) {
      return (
        <span
          key={i}
          className="inline-block rounded bg-black/10 px-1 py-0.5 text-[11px] font-medium leading-none text-emerald-900"
        >
          {/^\d+$/.test(match[1]!) ? `example_${match[1]}` : match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function WaMessagePreview({
  headerText,
  headerMedia,
  bodyText,
  footerText,
  templateName,
  buttons,
  buttonLabels,
  isCarousel,
  carouselCardCount,
}: WaMessagePreviewProps) {
  const { t } = useTranslation();

  const previewButtons =
    buttons ??
    (buttonLabels ?? []).map((text) => ({
      type: 'QUICK_REPLY' as const,
      text,
    }));

  const hasContent = !!(
    headerText?.trim() ||
    headerMedia ||
    bodyText?.trim() ||
    footerText?.trim() ||
    previewButtons.length
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {t('templates.create.previewLabel')}
      </p>

      <div className="relative flex h-[28rem] w-[13.5rem] flex-col overflow-hidden rounded-[2rem] border-[3px] border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="flex h-8 shrink-0 items-center justify-between bg-[#075E54] px-4">
          <span className="text-[10px] font-semibold text-white/90">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <div className="h-1.5 w-3 rounded-sm bg-white/80" />
            <div className="h-1.5 w-4 rounded-sm bg-white/80" />
          </div>
        </div>

        <div className="flex h-11 shrink-0 items-center gap-2 bg-[#075E54] px-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
            {templateName ? templateName[0].toUpperCase() : 'T'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {templateName || t('templates.create.previewNameFallback')}
            </p>
            <p className="text-[10px] text-white/70">
              {t('templates.create.previewOnline')}
            </p>
          </div>
        </div>

        <div
          className="relative flex-1 overflow-y-auto p-3"
          style={{ background: '#ECE5DD' }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
              backgroundSize: '8px 8px',
            }}
          />

          {hasContent ? (
            <div className="relative flex justify-end">
              <div
                className="relative max-w-[85%] overflow-hidden rounded-xl rounded-tr-none px-3 py-2 shadow-sm"
                style={{ background: '#DCF8C6' }}
              >
                <div
                  className="absolute -right-2 top-0 h-3 w-3"
                  style={{
                    background: '#DCF8C6',
                    clipPath: 'polygon(0 0, 0 100%, 100% 0)',
                  }}
                />

                {headerMedia && (
                  <TemplatePreviewMedia
                    format={headerMedia.format}
                    url={headerMedia.url}
                  />
                )}

                {headerText?.trim() && (
                  <p className="mb-1 text-[13px] font-bold leading-snug text-zinc-900">
                    {headerText.trim()}
                  </p>
                )}

                {bodyText?.trim() ? (
                  <p className="whitespace-pre-wrap text-[12.5px] leading-[1.4] text-zinc-900">
                    {renderBodyWithVariables(bodyText.trim())}
                  </p>
                ) : (
                  <p className="text-[12.5px] italic text-zinc-400">
                    {t('templates.create.previewBodyEmpty')}
                  </p>
                )}

                {footerText?.trim() && (
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                    {footerText.trim()}
                  </p>
                )}

                {isCarousel && (
                  <p className="mt-2 text-[11px] italic text-zinc-500">
                    {t(
                      'templates.carousel_preview_note',
                      'Carousel template — {{n}} cards',
                      {
                        n: carouselCardCount ?? '?',
                      },
                    )}
                  </p>
                )}

                {!isCarousel && (
                  <TemplatePreviewButtons buttons={previewButtons} />
                )}

                <div className="mt-1 flex items-end justify-end gap-0.5">
                  <span className="text-[10px] text-zinc-400">
                    {new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <svg
                    viewBox="0 0 16 11"
                    className="size-3.5 fill-[#53bdeb]"
                    aria-hidden
                  >
                    <path d="M11.071.653a.75.75 0 0 1 .042 1.06l-5.5 6a.75.75 0 0 1-1.118-.022L2.246 5.035a.75.75 0 1 1 1.133-.982l1.815 2.096 4.817-5.454a.75.75 0 0 1 1.06-.042Z" />
                    <path d="M14.571.653a.75.75 0 0 1 .042 1.06l-5.5 6a.75.75 0 0 1-1.102-.035L6.246 5.035a.75.75 0 0 1 1.133-.982l1.5 1.732 4.632-5.09a.75.75 0 0 1 1.06-.042Z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="rounded-lg bg-white/60 px-3 py-2 text-center text-[11px] text-zinc-500 shadow-sm">
                {t('templates.create.previewEmpty')}
              </p>
            </div>
          )}
        </div>

        <div className="flex h-10 shrink-0 items-center gap-2 bg-[#F0F0F0] px-3">
          <div className="flex-1 rounded-full bg-white px-3 py-1 text-[11px] text-zinc-400">
            {t('templates.create.previewInputHint')}
          </div>
          <div className="flex size-6 items-center justify-center rounded-full bg-[#075E54]">
            <svg
              viewBox="0 0 24 24"
              className="size-3.5 fill-white"
              aria-hidden
            >
              <path d="M2 12L22 2l-7 20-4-8-9-2Z" />
            </svg>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground max-w-50 text-center text-[11px] leading-snug">
        {t('templates.create.previewCaption')}
      </p>
    </div>
  );
}

import {
  Copy,
  ExternalLink,
  FileText,
  Grid3x3,
  Image,
  MapPin,
  Phone,
  PhoneCall,
  Reply,
  ShoppingBag,
  Sparkles,
  Star,
  UserPlus,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TemplateButton, TemplateButtonType } from '@/api/templates.api';
import { cn } from '@/lib/utils';

export function previewButtonLabel(
  btn: Pick<TemplateButton, 'type' | 'text' | 'icon'>,
  t: (key: string, defaultValue: string) => string,
): string {
  const custom = btn.text?.trim();
  if (custom) return custom;
  const key = `templates.create.buttons.types.${btn.type}`;
  return t(key, btn.type.replaceAll('_', ' '));
}

function ButtonGlyph({
  type,
  icon,
}: {
  type: TemplateButtonType;
  icon?: TemplateButton['icon'];
}) {
  const cls = 'size-3 shrink-0';
  if (type === 'FLOW') {
    if (icon === 'DOCUMENT') return <FileText className={cls} />;
    if (icon === 'PROMOTION') return <Sparkles className={cls} />;
    if (icon === 'REVIEW') return <Star className={cls} />;
    return <FileText className={cls} />;
  }
  switch (type) {
    case 'URL':
      return <ExternalLink className={cls} />;
    case 'PHONE_NUMBER':
      return <Phone className={cls} />;
    case 'VOICE_CALL':
      return <PhoneCall className={cls} />;
    case 'VIDEO_CALL':
      return <Video className={cls} />;
    case 'COPY_CODE':
    case 'OTP':
      return <Copy className={cls} />;
    case 'CATALOG':
      return <ShoppingBag className={cls} />;
    case 'MPM':
      return <Grid3x3 className={cls} />;
    case 'REQUEST_CONTACT_INFO':
      return <UserPlus className={cls} />;
    case 'QUICK_REPLY':
      return <Reply className={cls} />;
    default:
      return null;
  }
}

export function TemplatePreviewButtons({
  buttons,
  compact,
}: {
  buttons: Array<Pick<TemplateButton, 'type' | 'text' | 'icon'>>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (!buttons.length) return null;

  return (
    <div className={cn('flex flex-col gap-1', compact ? 'pt-1' : 'mt-2')}>
      {buttons.map((btn, i) => (
        <div
          key={`${btn.type}-${i}`}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md border border-emerald-800/20 bg-white/80 font-medium text-[#075E54]',
            compact
              ? 'px-2 py-0.5 text-[11px]'
              : 'px-2 py-1 text-[11px]',
          )}
        >
          <ButtonGlyph type={btn.type} icon={btn.icon} />
          <span className="truncate">
            {previewButtonLabel(btn, t)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TemplatePreviewMedia({
  format,
  url,
  compact,
}: {
  format: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  url?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const height = compact ? 'h-20' : 'h-24';
  if (format === 'IMAGE' && url) {
    return (
      <img
        src={url}
        alt=""
        className={cn(
          'mb-1.5 w-full rounded-md object-cover',
          compact ? 'h-20' : 'h-28',
        )}
      />
    );
  }
  if (format === 'VIDEO' && url) {
    return (
      <video
        src={url}
        className={cn('mb-1.5 w-full rounded-md object-cover', height)}
        muted
        playsInline
        preload="metadata"
      />
    );
  }
  const Icon =
    format === 'VIDEO'
      ? Video
      : format === 'DOCUMENT'
        ? FileText
        : format === 'LOCATION'
          ? MapPin
          : Image;
  const label = t(`templates.create.media.types.${format}`, format.toLowerCase());
  return (
    <div
      className={cn(
        'mb-1.5 flex flex-col items-center justify-center gap-1 rounded-md bg-white/60 text-[#667781]',
        height,
      )}
    >
      <Icon className={compact ? 'size-6' : 'size-7'} />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

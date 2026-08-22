import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MessageStatus } from '@/api/messages.api';
import { cn } from '@/lib/utils';

interface MessageDeliveryStatusProps {
  status: MessageStatus;
  failureReason?: string | null;
  className?: string;
}

/**
 * WhatsApp-style delivery ticks for outbound bubbles.
 * queued → clock · sent → ✓ · delivered → ✓✓ · read → ✓✓ (emphasized) · failed → !
 */
export function MessageDeliveryStatus({
  status,
  failureReason,
  className,
}: MessageDeliveryStatusProps) {
  const { t } = useTranslation();

  if (status === 'failed') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-[10px] text-red-400 dark:text-red-400',
          className,
        )}
        title={failureReason ?? t('inbox.status.failed')}
        aria-label={failureReason ?? t('inbox.status.failed')}
      >
        <AlertCircle className="size-3" aria-hidden />
      </span>
    );
  }

  const label = t(`inbox.status.${status}`);
  const Icon =
    status === 'queued' ? Clock : status === 'sent' ? Check : CheckCheck;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px]',
        status === 'read' ? 'opacity-100' : 'opacity-60',
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Icon
        className={cn(
          'size-3',
          status === 'read' && 'text-[#53bdeb]',
          status === 'delivered' && 'text-current',
        )}
        aria-hidden
      />
    </span>
  );
}

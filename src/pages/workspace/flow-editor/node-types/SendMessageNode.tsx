import { Image, MessageSquare, MousePointerClick } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FlowNodeCard, type FlowNodeComponentProps } from './FlowNodeCard';

const PREVIEW_CHARS = 50;

/** Sends a WhatsApp message — text, media, or interactive — then continues. */
export function SendMessageNode({ data, selected }: FlowNodeComponentProps) {
  const { t } = useTranslation();
  const mode = data.messageType ?? 'text';

  const source =
    mode === 'media'
      ? (data.mediaCaption ?? data.mediaUrl ?? '')
      : mode === 'interactive'
        ? (data.interactiveBody ?? '')
        : (data.message ?? '');
  const text = source.trim();
  const preview =
    text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text;

  const icon =
    mode === 'media'
      ? Image
      : mode === 'interactive'
        ? MousePointerClick
        : MessageSquare;

  return (
    <FlowNodeCard
      type="send_message"
      selected={selected}
      icon={icon}
      preview={preview || t('flows.node.no_message', '(No message set)')}
      healthWarning={data.healthWarning}
    />
  );
}

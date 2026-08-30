import { useTranslation } from 'react-i18next';
import { FlowNodeCard, type FlowNodeComponentProps } from './FlowNodeCard';

const PREVIEW_CHARS = 60;

/** Sends a free-text WhatsApp message, then continues. */
export function SendMessageNode({ data, selected }: FlowNodeComponentProps) {
  const { t } = useTranslation();
  const message = (data.message ?? '').trim();
  const preview =
    message.length > PREVIEW_CHARS
      ? `${message.slice(0, PREVIEW_CHARS)}…`
      : message;

  return (
    <FlowNodeCard
      type="send_message"
      selected={selected}
      preview={preview || t('flows.node.no_message', '(No message set)')}
      healthWarning={data.healthWarning}
    />
  );
}

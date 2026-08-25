import { useTranslation } from 'react-i18next';
import { FlowNodeCard, type FlowNodeComponentProps } from './FlowNodeCard';

/**
 * Pauses the run until the contact writes back. The single `replied` output is
 * the only branch the flow runner follows — there is no timeout branch yet.
 */
export function WaitForReplyNode({ selected }: FlowNodeComponentProps) {
  const { t } = useTranslation();

  return (
    <FlowNodeCard
      type="wait_for_reply"
      selected={selected}
      preview={t('flows.node.wait_preview', 'Waits for the contact to reply')}
      note={t('flows.node.wait_note', 'Continues when they answer')}
      outputs={[{ id: 'replied' }]}
    />
  );
}

import { useTranslation } from 'react-i18next';
import { FlowNodeCard, type FlowNodeComponentProps } from './FlowNodeCard';

/** Where every run starts. Mirrors the flow's own trigger settings. */
export function TriggerNode({ data, selected }: FlowNodeComponentProps) {
  const { t } = useTranslation();
  const triggerType = data.triggerType ?? 'first_message';
  const keywords = data.triggerKeywords ?? [];
  const label = t(`flows.trigger_${triggerType}`);

  return (
    <FlowNodeCard
      type="trigger"
      selected={selected}
      hasInput={false}
      preview={label}
      note={
        triggerType === 'keyword'
          ? keywords.length > 0
            ? keywords.join(', ')
            : t('flows.node.trigger_no_keywords', 'No keywords set yet')
          : undefined
      }
    />
  );
}

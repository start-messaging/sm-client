import { useTranslation } from 'react-i18next';
import { FlowNodeCard, type FlowNodeComponentProps } from './FlowNodeCard';

export function WaitDelayNode({ data, selected }: FlowNodeComponentProps) {
  const { t } = useTranslation();
  const preview =
    data.delayAmount && data.delayUnit
      ? t('flows.node.wait_delay_preview', 'Wait {{amount}} {{unit}}', {
          amount: data.delayAmount,
          unit: data.delayUnit,
        })
      : t('flows.node.wait_delay_unconfigured', 'Set a duration…');

  return (
    <FlowNodeCard
      type="wait_delay"
      selected={selected}
      preview={preview}
      outputs={[{ id: 'default' }]}
    />
  );
}

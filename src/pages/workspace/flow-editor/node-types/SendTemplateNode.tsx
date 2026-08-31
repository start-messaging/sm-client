import { useTranslation } from 'react-i18next';
import { FlowNodeCard, type FlowNodeComponentProps } from './FlowNodeCard';

/** Sends an approved template — the only valid send after a delay. */
export function SendTemplateNode({ data, selected }: FlowNodeComponentProps) {
  const { t } = useTranslation();
  const templateName = (data.templateName ?? '').trim();

  return (
    <FlowNodeCard
      type="send_template"
      selected={selected}
      preview={
        templateName || t('flows.node.no_template', '(No template chosen)')
      }
      healthWarning={data.healthWarning}
    />
  );
}

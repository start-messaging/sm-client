import { useTranslation } from 'react-i18next';
import type { FlowNodeType } from '@/api/flows.api';
import {
  FlowNodeCard,
  type FlowEditorNodeData,
  type FlowNodeComponentProps,
} from './FlowNodeCard';

/** Steps that legitimately end the run — the runner follows nothing after them. */
const TERMINAL_TYPES: FlowNodeType[] = ['end', 'assign_agent'];

function usePreview(type: FlowNodeType, data: FlowEditorNodeData): string {
  const { t } = useTranslation();

  switch (type) {
    case 'set_field': {
      const field = data.field ?? '';
      return field
        ? `${field} = ${data.value ?? ''}`
        : t('flows.node.no_field', '(No field set)');
    }
    case 'add_tag':
    case 'remove_tag':
      return data.tag || t('flows.node.no_tag', '(No tag set)');
    case 'change_stage':
      return (
        data.stageName ??
        data.stageId ??
        t('flows.node.no_stage', '(No stage set)')
      );
    case 'assign_agent':
      return (
        data.userName ??
        data.userId ??
        t('flows.node.no_agent', '(No teammate set)')
      );
    default:
      return t('flows.node.end_preview', 'The flow stops here');
  }
}

/**
 * The side-effect steps: contact/session updates that run and continue, plus
 * the two terminal steps (`assign_agent` hands over to a human, `end` closes
 * the session) which render without an output handle.
 */
export function ActionNode({ type, data, selected }: FlowNodeComponentProps) {
  const preview = usePreview(type, data);

  return (
    <FlowNodeCard
      type={type}
      selected={selected}
      preview={preview}
      outputs={TERMINAL_TYPES.includes(type) ? [] : undefined}
    />
  );
}

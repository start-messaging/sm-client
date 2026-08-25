import { useTranslation } from 'react-i18next';
import {
  FlowNodeCard,
  type FlowNodeComponentProps,
  type FlowNodeOutput,
} from './FlowNodeCard';

const PREVIEW_CHARS = 60;

function truncate(text: string): string {
  return text.length > PREVIEW_CHARS
    ? `${text.slice(0, PREVIEW_CHARS)}…`
    : text;
}

/**
 * Splits the run. `button_branch` / `list_branch` ask the contact and take one
 * output per option (handle id = option id); `condition` tests a variable and
 * takes the `yes` / `no` output the runner follows.
 */
export function BranchNode({ type, data, selected }: FlowNodeComponentProps) {
  const { t } = useTranslation();

  if (type === 'condition') {
    const variable = data.variable ?? '';
    const operator = data.operator ?? 'equals';
    const value = data.value ?? '';
    const outputs: FlowNodeOutput[] = [
      { id: 'yes', label: t('flows.branch.yes', 'Yes') },
      { id: 'no', label: t('flows.branch.no', 'No') },
    ];

    return (
      <FlowNodeCard
        type="condition"
        selected={selected}
        outputs={outputs}
        preview={
          variable
            ? `${variable} ${t(`flows.operator.${operator}`, operator)} ${value}`
            : t('flows.node.no_condition', '(No condition set)')
        }
      />
    );
  }

  const options = data.options ?? [];
  const body = truncate((data.body ?? '').trim());
  const outputs: FlowNodeOutput[] =
    options.length > 0
      ? options.map((option) => ({ id: option.id, label: option.title }))
      : [{ id: 'out' }];

  return (
    <FlowNodeCard
      type={type}
      selected={selected}
      outputs={outputs}
      preview={body || t('flows.node.no_question', '(No question set)')}
      note={
        options.length > 0
          ? t('flows.node.option_count', {
              count: options.length,
              defaultValue: '{{count}} options',
              defaultValue_one: '1 option',
            })
          : t('flows.node.no_options', 'No options yet')
      }
    />
  );
}

import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMembers } from '@/api/hooks/use-members';
import { usePipelineStages } from '@/api/hooks/use-pipeline-stages';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { cn } from '@/lib/utils';
import {
  NODE_TYPE_META,
  type FlowBranchOption,
  type FlowEditorNode,
  type FlowEditorNodeData,
} from './node-types';

/** What the flow runner can substitute into a message body. */
const VARIABLES = ['contact.name', 'contact.phone', 'contact.email', 'reply'];

/** Meta's caps on interactive messages — enforced here, not after a 400. */
const LIMITS = {
  body: 1024,
  buttonTitle: 20,
  buttonLabel: 20,
  rowTitle: 24,
  rowDescription: 72,
  maxButtons: 3,
  maxRows: 10,
} as const;

const CONDITION_VARIABLES = ['reply', 'contact.name', 'contact.phone'];
const CONDITION_OPERATORS = ['equals', 'contains', 'not_equals'];

interface ConfigPanelProps {
  selectedNode: FlowEditorNode | null;
  triggerType: string;
  triggerKeywords: string[];
  onTriggerTypeChange: (type: string) => void;
  onTriggerKeywordsChange: (keywords: string[]) => void;
  onDataChange: (nodeId: string, patch: FlowEditorNodeData) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

type FieldChange = (patch: FlowEditorNodeData) => void;

function newOptionId(): string {
  return crypto.randomUUID();
}

// ── Message body with the {{variable}} picker ────────────────────────────────

function VariableTextarea({
  value,
  onValueChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);

  // The DOM value is read instead of `value` so the caret check sees the
  // keystroke that just landed, not the previous render's state.
  function syncPicker() {
    const element = ref.current;
    if (!element) return;
    const caret = element.selectionStart ?? 0;
    setOpen(element.value.slice(0, caret).endsWith('{{'));
  }

  function insertVariable(variable: string) {
    const element = ref.current;
    if (!element) return;
    const caret = element.selectionStart ?? element.value.length;
    const next = `${element.value.slice(0, caret)}${variable}}}${element.value.slice(caret)}`;
    onValueChange(next.slice(0, maxLength));
    setOpen(false);
    requestAnimationFrame(() => {
      const caretAfter = caret + variable.length + 2;
      element.focus();
      element.setSelectionRange(caretAfter, caretAfter);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyUp={syncPicker}
          onClick={syncPicker}
          className="min-h-24 text-[13px]"
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-56 gap-0.5 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <p className="px-1.5 py-1 text-[11px] text-[#71717a]">
          {t('flows.config.variables', 'Insert a value')}
        </p>
        {VARIABLES.map((variable) => (
          <Button
            key={variable}
            variant="ghost"
            size="sm"
            className="h-7 justify-start font-mono text-[12px]"
            onClick={() => insertVariable(variable)}
          >
            {variable}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px] text-[#71717a]">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-[#a1a1aa]">{hint}</p>}
    </div>
  );
}

// ── Repeated string list (trigger keywords) ──────────────────────────────────

function StringListField({
  values,
  onValuesChange,
  placeholder,
  addLabel,
  removeLabel,
}: {
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-1">
          <Input
            value={value}
            placeholder={placeholder}
            className="h-8 text-[13px]"
            onChange={(event) =>
              onValuesChange(
                values.map((current, i) =>
                  i === index ? event.target.value : current,
                ),
              )
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-[#a1a1aa]"
            aria-label={removeLabel}
            onClick={() => onValuesChange(values.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-8 justify-start"
        onClick={() => onValuesChange([...values, ''])}
      >
        <Plus className="mr-1.5 size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

// ── Branch options (buttons / list rows) ─────────────────────────────────────

function OptionsField({
  options,
  onOptionsChange,
  withDescription,
  max,
  titleMax,
}: {
  options: FlowBranchOption[];
  onOptionsChange: (options: FlowBranchOption[]) => void;
  withDescription: boolean;
  max: number;
  titleMax: number;
}) {
  const { t } = useTranslation();

  function patchOption(index: number, patch: Partial<FlowBranchOption>) {
    onOptionsChange(
      options.map((option, i) =>
        i === index ? { ...option, ...patch } : option,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => (
        <div
          key={option.id}
          className="flex flex-col gap-1.5 rounded-lg border border-[#e4e4e7] p-2"
        >
          <div className="flex items-center gap-1">
            <Input
              value={option.title}
              maxLength={titleMax}
              placeholder={t('flows.config.option_title', 'Option label')}
              className="h-8 text-[13px]"
              onChange={(event) =>
                patchOption(index, { title: event.target.value })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-[#a1a1aa]"
              aria-label={t('flows.config.remove_option', 'Remove option')}
              onClick={() =>
                onOptionsChange(options.filter((_, i) => i !== index))
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          {withDescription && (
            <Input
              value={option.description ?? ''}
              maxLength={LIMITS.rowDescription}
              placeholder={t(
                'flows.config.option_description',
                'Description (optional)',
              )}
              className="h-8 text-[13px]"
              onChange={(event) =>
                patchOption(index, { description: event.target.value })
              }
            />
          )}
        </div>
      ))}

      {options.length < max ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start"
          onClick={() =>
            onOptionsChange([...options, { id: newOptionId(), title: '' }])
          }
        >
          <Plus className="mr-1.5 size-3.5" />
          {t('flows.config.add_option', 'Add option')}
        </Button>
      ) : (
        <p className="text-[11px] text-[#a1a1aa]">
          {t(
            'flows.config.option_max',
            'WhatsApp allows {{count}} options on this step.',
            { count: max },
          )}
        </p>
      )}
    </div>
  );
}

// ── Node-type sections that need workspace data ──────────────────────────────

function ChangeStageFields({
  data,
  onChange,
}: {
  data: FlowEditorNodeData;
  onChange: FieldChange;
}) {
  const { t } = useTranslation();
  const workspace = useCurrentWorkspace();
  const { data: stagesData } = usePipelineStages(workspace.slug);
  const stages = stagesData?.pipelineStages ?? [];

  if (stages.length === 0) {
    return (
      <Section
        label={t('flows.config.stage', 'Move the contact to')}
        hint={t(
          'flows.config.stage_empty',
          'This workspace has no pipeline stages yet. Add them in Settings, then pick one here.',
        )}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-start"
          asChild
        >
          <Link to={`/w/${workspace.slug}/settings`}>
            {t('flows.config.stage_settings', 'Open settings')}
          </Link>
        </Button>
      </Section>
    );
  }

  return (
    <Section label={t('flows.config.stage', 'Move the contact to')}>
      <Select
        value={data.stageId ?? undefined}
        onValueChange={(stageId) =>
          onChange({
            stageId,
            stageName: stages.find((stage) => stage.id === stageId)?.name,
          })
        }
      >
        <SelectTrigger className="h-8 w-full text-[13px]">
          <SelectValue
            placeholder={t('flows.config.stage_pick', 'Pick a stage')}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Section>
  );
}

function AssignAgentFields({
  data,
  onChange,
}: {
  data: FlowEditorNodeData;
  onChange: FieldChange;
}) {
  const { t } = useTranslation();
  const workspace = useCurrentWorkspace();
  const { data: roster } = useMembers(workspace.slug, workspace.id);
  const members = roster?.members ?? [];

  return (
    <Section
      label={t('flows.config.agent', 'Hand the chat to')}
      hint={t(
        'flows.config.agent_hint',
        'The bot stops here and the conversation waits for this teammate.',
      )}
    >
      <Select
        value={data.userId ?? undefined}
        onValueChange={(userId) =>
          onChange({
            userId,
            userName: members.find((member) => member.userId === userId)
              ?.fullName,
          })
        }
      >
        <SelectTrigger className="h-8 w-full text-[13px]">
          <SelectValue
            placeholder={t('flows.config.agent_pick', 'Pick a teammate')}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {members.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Section>
  );
}

// ── Per-type body ────────────────────────────────────────────────────────────

function NodeFields({
  node,
  triggerType,
  triggerKeywords,
  onTriggerTypeChange,
  onTriggerKeywordsChange,
  onChange,
}: {
  node: FlowEditorNode;
  triggerType: string;
  triggerKeywords: string[];
  onTriggerTypeChange: (type: string) => void;
  onTriggerKeywordsChange: (keywords: string[]) => void;
  onChange: FieldChange;
}) {
  const { t } = useTranslation();
  const data = node.data;

  switch (node.type) {
    case 'trigger': {
      return (
        <>
          <Section
            label={t('flows.config.trigger_type', 'Starts when')}
            hint={t(
              'flows.config.trigger_type_hint',
              'Controls which inbound messages start a new session of this flow.',
            )}
          >
            <Select value={triggerType} onValueChange={onTriggerTypeChange}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="first_message">
                    {t('flows.trigger_first_message', 'First message')}
                  </SelectItem>
                  <SelectItem value="keyword">
                    {t('flows.trigger_keyword', 'Keyword')}
                  </SelectItem>
                  <SelectItem value="any_inbound">
                    {t('flows.trigger_any_inbound', 'Any inbound message')}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Section>
          {triggerType === 'keyword' && (
            <Section
              label={t('flows.config.keywords', 'Keywords')}
              hint={t(
                'flows.config.keywords_hint',
                'The flow starts when an incoming message contains any of these.',
              )}
            >
              <StringListField
                values={triggerKeywords}
                placeholder={t(
                  'flows.config.keyword_placeholder',
                  'e.g. price',
                )}
                addLabel={t('flows.config.add_keyword', 'Add keyword')}
                removeLabel={t('flows.config.remove_keyword', 'Remove keyword')}
                onValuesChange={onTriggerKeywordsChange}
              />
            </Section>
          )}
        </>
      );
    }

    case 'send_message':
      return (
        <Section
          label={t('flows.config.message', 'Message')}
          hint={t(
            'flows.config.message_hint',
            'Type {{token}} to insert a contact value.',
            { token: '{{' },
          )}
        >
          <VariableTextarea
            value={data.message ?? ''}
            maxLength={LIMITS.body}
            placeholder={t(
              'flows.config.message_placeholder',
              'Hi! How can we help?',
            )}
            onValueChange={(message) => onChange({ message })}
          />
        </Section>
      );

    case 'wait_for_reply':
      return (
        <p className="text-[12px] leading-relaxed text-[#71717a]">
          {t(
            'flows.config.wait_hint',
            'The flow pauses here until the contact sends a message. Their answer is saved and can be used by the steps that follow.',
          )}
        </p>
      );

    case 'wait_delay':
      return (
        <Section label={t('flows.config.wait_delay_duration', 'Duration')}>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={365}
              value={data.delayAmount ?? 1}
              onChange={(e) =>
                onChange({ delayAmount: Number(e.target.value) })
              }
              className="h-8 w-24 text-[13px]"
            />
            <Select
              value={data.delayUnit ?? 'hours'}
              onValueChange={(val) => onChange({ delayUnit: val })}
            >
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="minutes">
                    {t('flows.config.delay_minutes', 'minutes')}
                  </SelectItem>
                  <SelectItem value="hours">
                    {t('flows.config.delay_hours', 'hours')}
                  </SelectItem>
                  <SelectItem value="days">
                    {t('flows.config.delay_days', 'days')}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </Section>
      );

    case 'button_branch':
      return (
        <>
          <Section label={t('flows.config.question', 'Question')}>
            <VariableTextarea
              value={data.body ?? ''}
              maxLength={LIMITS.body}
              placeholder={t(
                'flows.config.question_placeholder',
                'What would you like to do?',
              )}
              onValueChange={(body) => onChange({ body })}
            />
          </Section>
          <Section
            label={t('flows.config.buttons', 'Buttons')}
            hint={t(
              'flows.config.buttons_hint',
              'Each button becomes its own path on the canvas.',
            )}
          >
            <OptionsField
              options={data.options ?? []}
              withDescription={false}
              max={LIMITS.maxButtons}
              titleMax={LIMITS.buttonTitle}
              onOptionsChange={(options) => onChange({ options })}
            />
          </Section>
        </>
      );

    case 'list_branch':
      return (
        <>
          <Section label={t('flows.config.question', 'Question')}>
            <VariableTextarea
              value={data.body ?? ''}
              maxLength={LIMITS.body}
              placeholder={t(
                'flows.config.question_placeholder',
                'What would you like to do?',
              )}
              onValueChange={(body) => onChange({ body })}
            />
          </Section>
          <Section label={t('flows.config.list_button', 'List button label')}>
            <Input
              value={data.buttonLabel ?? ''}
              maxLength={LIMITS.buttonLabel}
              placeholder={t('flows.config.list_button_placeholder', 'Choose')}
              className="h-8 text-[13px]"
              onChange={(event) =>
                onChange({ buttonLabel: event.target.value })
              }
            />
          </Section>
          <Section label={t('flows.config.rows', 'List options')}>
            <OptionsField
              options={data.options ?? []}
              withDescription
              max={LIMITS.maxRows}
              titleMax={LIMITS.rowTitle}
              onOptionsChange={(options) => onChange({ options })}
            />
          </Section>
        </>
      );

    case 'condition':
      return (
        <>
          <Section label={t('flows.config.check', 'Check')}>
            <Select
              value={data.variable ?? 'reply'}
              onValueChange={(variable) => onChange({ variable })}
            >
              <SelectTrigger className="h-8 w-full text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CONDITION_VARIABLES.map((variable) => (
                    <SelectItem key={variable} value={variable}>
                      {variable}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Section>
          <Section label={t('flows.config.operator', 'Condition')}>
            <Select
              value={data.operator ?? 'equals'}
              onValueChange={(operator) => onChange({ operator })}
            >
              <SelectTrigger className="h-8 w-full text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CONDITION_OPERATORS.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {t(`flows.operator.${operator}`, operator)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Section>
          <Section
            label={t('flows.config.value', 'Value')}
            hint={t(
              'flows.config.condition_hint',
              'Matching messages take the Yes path, everything else takes No.',
            )}
          >
            <Input
              value={data.value ?? ''}
              className="h-8 text-[13px]"
              onChange={(event) => onChange({ value: event.target.value })}
            />
          </Section>
        </>
      );

    case 'set_field':
      return (
        <>
          <Section label={t('flows.config.field', 'Save into')}>
            <Select
              value={data.field ?? 'reply'}
              onValueChange={(field) => onChange({ field })}
            >
              <SelectTrigger className="h-8 w-full text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="reply">reply</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Section>
          <Section
            label={t('flows.config.value', 'Value')}
            hint={t(
              'flows.config.set_field_hint',
              'Stored for this conversation only — later steps can use it.',
            )}
          >
            <Input
              value={data.value ?? ''}
              className="h-8 text-[13px]"
              onChange={(event) => onChange({ value: event.target.value })}
            />
          </Section>
        </>
      );

    case 'add_tag':
    case 'remove_tag':
      return (
        <Section
          label={t('flows.config.tag', 'Tag')}
          hint={t(
            'flows.config.tag_hint',
            'Tags are how you segment contacts for campaigns.',
          )}
        >
          <Input
            value={data.tag ?? ''}
            placeholder={t('flows.config.tag_placeholder', 'e.g. interested')}
            className="h-8 text-[13px]"
            onChange={(event) => onChange({ tag: event.target.value })}
          />
        </Section>
      );

    case 'change_stage':
      return <ChangeStageFields data={data} onChange={onChange} />;

    case 'assign_agent':
      return <AssignAgentFields data={data} onChange={onChange} />;

    default:
      return (
        <p className="text-[12px] leading-relaxed text-[#71717a]">
          {t(
            'flows.config.end_hint',
            'The flow finishes here. The contact can start it again if the trigger matches a new message.',
          )}
        </p>
      );
  }
}

// ── Panel ────────────────────────────────────────────────────────────────────

/** Right rail that slides in with the selected step's settings. */
export function ConfigPanel({
  selectedNode,
  triggerType,
  triggerKeywords,
  onTriggerTypeChange,
  onTriggerKeywordsChange,
  onDataChange,
  onDeleteNode,
  onClose,
}: ConfigPanelProps) {
  const { t } = useTranslation();
  const meta = selectedNode?.type ? NODE_TYPE_META[selectedNode.type] : null;
  const HeaderIcon = meta?.icon;

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden border-l border-[#e4e4e7] bg-white transition-[width] duration-200',
        selectedNode ? 'w-[280px]' : 'w-0 border-l-0',
      )}
    >
      <div
        className={cn(
          'flex h-full w-[280px] flex-col transition-transform duration-200',
          selectedNode ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {selectedNode && meta && HeaderIcon && (
          <>
            <div className="flex h-[44px] shrink-0 items-center gap-2 border-b border-[#e4e4e7] px-3">
              <HeaderIcon className="size-3.5 text-[#a1a1aa]" />
              <span className="text-[13px] font-medium text-[#18181b]">
                {t(meta.labelKey, meta.label)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-7 text-[#a1a1aa]"
                aria-label={t('common.cancel')}
                onClick={onClose}
              >
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
              <NodeFields
                node={selectedNode}
                triggerType={triggerType}
                triggerKeywords={triggerKeywords}
                onTriggerTypeChange={onTriggerTypeChange}
                onTriggerKeywordsChange={onTriggerKeywordsChange}
                onChange={(patch) => onDataChange(selectedNode.id, patch)}
              />
            </div>

            {selectedNode.type !== 'trigger' && (
              <div className="shrink-0 border-t border-[#e4e4e7] p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-[#b91c1c] hover:bg-[#fef2f2] hover:text-[#b91c1c]"
                  onClick={() => onDeleteNode(selectedNode.id)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  {t('flows.config.delete_step', 'Delete step')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

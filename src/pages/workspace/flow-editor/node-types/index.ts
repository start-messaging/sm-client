import type { NodeTypes } from '@xyflow/react';
import {
  CircleStop,
  Clock,
  Filter,
  GitBranch,
  Layers,
  List,
  MessageSquare,
  PenLine,
  Tag,
  TagIcon,
  UserCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { FlowNodeType } from '@/api/flows.api';
import { ActionNode } from './ActionNode';
import { BranchNode } from './BranchNode';
import { SendMessageNode } from './SendMessageNode';
import { TriggerNode } from './TriggerNode';
import { WaitForReplyNode } from './WaitForReplyNode';

export type {
  FlowBranchOption,
  FlowEditorNode,
  FlowEditorNodeData,
  FlowNodeComponentProps,
  FlowNodeOutput,
} from './FlowNodeCard';

export interface NodeTypeMeta {
  icon: LucideIcon;
  /** i18n key; `label` is the English fallback passed to `t()`. */
  labelKey: string;
  label: string;
}

/** Icon + label for every step type — the canvas cards and the palette share it. */
export const NODE_TYPE_META: Record<FlowNodeType, NodeTypeMeta> = {
  trigger: { icon: Zap, labelKey: 'flows.node.trigger', label: 'Trigger' },
  send_message: {
    icon: MessageSquare,
    labelKey: 'flows.node.send_message',
    label: 'Send message',
  },
  wait_for_reply: {
    icon: Clock,
    labelKey: 'flows.node.wait_for_reply',
    label: 'Wait for reply',
  },
  button_branch: {
    icon: GitBranch,
    labelKey: 'flows.node.button_branch',
    label: 'Button branch',
  },
  list_branch: {
    icon: List,
    labelKey: 'flows.node.list_branch',
    label: 'List branch',
  },
  condition: {
    icon: Filter,
    labelKey: 'flows.node.condition',
    label: 'Condition',
  },
  set_field: {
    icon: PenLine,
    labelKey: 'flows.node.set_field',
    label: 'Set field',
  },
  add_tag: { icon: Tag, labelKey: 'flows.node.add_tag', label: 'Add tag' },
  remove_tag: {
    icon: TagIcon,
    labelKey: 'flows.node.remove_tag',
    label: 'Remove tag',
  },
  change_stage: {
    icon: Layers,
    labelKey: 'flows.node.change_stage',
    label: 'Change stage',
  },
  assign_agent: {
    icon: UserCheck,
    labelKey: 'flows.node.assign_agent',
    label: 'Assign agent',
  },
  end: { icon: CircleStop, labelKey: 'flows.node.end', label: 'End' },
};

/** Palette order: start, talk, branch, then the side effects and the stop. */
export const PALETTE_NODE_TYPES: FlowNodeType[] = [
  'trigger',
  'send_message',
  'wait_for_reply',
  'button_branch',
  'list_branch',
  'condition',
  'set_field',
  'add_tag',
  'remove_tag',
  'change_stage',
  'assign_agent',
  'end',
];

export const nodeTypes = {
  trigger: TriggerNode,
  send_message: SendMessageNode,
  wait_for_reply: WaitForReplyNode,
  button_branch: BranchNode,
  list_branch: BranchNode,
  condition: BranchNode,
  set_field: ActionNode,
  add_tag: ActionNode,
  remove_tag: ActionNode,
  change_stage: ActionNode,
  assign_agent: ActionNode,
  end: ActionNode,
} satisfies NodeTypes;

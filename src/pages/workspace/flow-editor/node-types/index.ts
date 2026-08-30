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
  Timer,
  UserCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { FlowNodeType } from '@/api/flows.api';
import { ActionNode } from './ActionNode';
import { BranchNode } from './BranchNode';
import { SendMessageNode } from './SendMessageNode';
import { TriggerNode } from './TriggerNode';
import { WaitDelayNode } from './WaitDelayNode';
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
  /** i18n key for the palette tooltip; `description` is the English fallback. */
  descriptionKey: string;
  description: string;
}

/** Icon + label for every step type — the canvas cards and the palette share it. */
export const NODE_TYPE_META: Record<FlowNodeType, NodeTypeMeta> = {
  trigger: {
    icon: Zap,
    labelKey: 'flows.node.trigger',
    label: 'Trigger',
    descriptionKey: 'flows.node.trigger_desc',
    description: 'The entry point of the flow. Fires on the first inbound message, a specific keyword, or any inbound message.',
  },
  send_message: {
    icon: MessageSquare,
    labelKey: 'flows.node.send_message',
    label: 'Send message',
    descriptionKey: 'flows.node.send_message_desc',
    description: 'Sends a text message to the contact. Use {{contact.name}}, {{contact.phone}}, or {{reply}} to personalise.',
  },
  wait_for_reply: {
    icon: Clock,
    labelKey: 'flows.node.wait_for_reply',
    label: 'Wait for reply',
    descriptionKey: 'flows.node.wait_for_reply_desc',
    description: 'Pauses the flow until the contact replies, or until an optional timeout expires and the flow continues automatically.',
  },
  wait_delay: {
    icon: Timer,
    labelKey: 'flows.node.wait_delay',
    label: 'Wait',
    descriptionKey: 'flows.node.wait_delay_desc',
    description: 'Pause the flow for a set amount of time before continuing.',
  },
  button_branch: {
    icon: GitBranch,
    labelKey: 'flows.node.button_branch',
    label: 'Button branch',
    descriptionKey: 'flows.node.button_branch_desc',
    description: 'Sends a WhatsApp interactive reply-button message and branches the flow based on which button the contact taps.',
  },
  list_branch: {
    icon: List,
    labelKey: 'flows.node.list_branch',
    label: 'List branch',
    descriptionKey: 'flows.node.list_branch_desc',
    description: 'Sends a WhatsApp list message (up to 10 rows) and branches based on the row the contact selects.',
  },
  condition: {
    icon: Filter,
    labelKey: 'flows.node.condition',
    label: 'Condition',
    descriptionKey: 'flows.node.condition_desc',
    description: 'Evaluates a contact field or the last reply against a condition and takes the matching path.',
  },
  set_field: {
    icon: PenLine,
    labelKey: 'flows.node.set_field',
    label: 'Set field',
    descriptionKey: 'flows.node.set_field_desc',
    description: 'Updates a contact field (name, email, phone, or a custom attribute) silently in the background.',
  },
  add_tag: {
    icon: Tag,
    labelKey: 'flows.node.add_tag',
    label: 'Add tag',
    descriptionKey: 'flows.node.add_tag_desc',
    description: 'Attaches a tag to the contact for segmentation and future filtering.',
  },
  remove_tag: {
    icon: TagIcon,
    labelKey: 'flows.node.remove_tag',
    label: 'Remove tag',
    descriptionKey: 'flows.node.remove_tag_desc',
    description: 'Removes a tag that was previously added to the contact.',
  },
  change_stage: {
    icon: Layers,
    labelKey: 'flows.node.change_stage',
    label: 'Change stage',
    descriptionKey: 'flows.node.change_stage_desc',
    description: 'Moves the contact\'s conversation to a different pipeline stage automatically.',
  },
  assign_agent: {
    icon: UserCheck,
    labelKey: 'flows.node.assign_agent',
    label: 'Assign agent',
    descriptionKey: 'flows.node.assign_agent_desc',
    description: 'Assigns the conversation to a specific team member to take over from the bot.',
  },
  end: {
    icon: CircleStop,
    labelKey: 'flows.node.end',
    label: 'End',
    descriptionKey: 'flows.node.end_desc',
    description: 'Marks the end of this flow path. The session closes and the bot stops listening.',
  },
};

/** Palette order: start, talk, branch, then the side effects and the stop. */
export const PALETTE_NODE_TYPES: FlowNodeType[] = [
  'trigger',
  'send_message',
  'wait_for_reply',
  'wait_delay',
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
  wait_delay: WaitDelayNode,
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

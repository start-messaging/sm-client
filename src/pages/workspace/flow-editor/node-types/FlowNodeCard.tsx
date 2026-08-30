import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import type { FlowNodeType, FlowTriggerType } from '@/api/flows.api';
import { cn } from '@/lib/utils';
import { NODE_TYPE_META } from './index';

/** One choice offered by a `button_branch` / `list_branch` step. */
export interface FlowBranchOption {
  id: string;
  title: string;
  description?: string;
}

/**
 * The union of every step's config. The server stores `data` untyped (each node
 * type owns its shape), so the editor declares all fields optional and reads
 * only the ones its type uses. `stageName` / `userName` are display-only
 * mirrors the canvas renders without refetching the roster or the pipeline.
 */
export interface FlowEditorNodeData extends Record<string, unknown> {
  message?: string;
  body?: string;
  buttonLabel?: string;
  options?: FlowBranchOption[];
  variable?: string;
  operator?: string;
  value?: string;
  field?: string;
  tag?: string;
  stageId?: string | null;
  stageName?: string;
  userId?: string | null;
  userName?: string;
  delayAmount?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  triggerType?: FlowTriggerType;
  triggerKeywords?: string[];
  /** Amber health warning injected by findFlowHealthWarnings — display only, never persisted. */
  healthWarning?: string;
}

export type FlowEditorNode = Node<FlowEditorNodeData, FlowNodeType>;
export type FlowNodeComponentProps = NodeProps<FlowEditorNode>;

/** A source handle. `id` must match what the flow runner follows. */
export interface FlowNodeOutput {
  id: string;
  label?: string;
}

// Inline so React Flow's own stylesheet can't win the specificity tie.
const HANDLE_STYLE = {
  width: 8,
  height: 8,
  borderRadius: 9999,
  background: '#e4e4e7',
  border: '1.5px solid #71717a',
} as const;

const SINGLE_OUTPUT: FlowNodeOutput[] = [{ id: 'out' }];

interface FlowNodeCardProps {
  type: FlowNodeType;
  preview: string;
  /** Secondary line, e.g. "3 options". */
  note?: string;
  selected?: boolean;
  hasInput?: boolean;
  outputs?: FlowNodeOutput[];
  healthWarning?: string;
}

function handleOffset(index: number, total: number): string {
  return `${((index + 1) / (total + 1)) * 100}%`;
}

/** The shared canvas card. Every node type renders through this. */
export function FlowNodeCard({
  type,
  preview,
  note,
  selected = false,
  hasInput = true,
  outputs = SINGLE_OUTPUT,
  healthWarning,
}: FlowNodeCardProps) {
  const { t } = useTranslation();
  const meta = NODE_TYPE_META[type];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        'relative min-w-[200px] max-w-[260px] rounded-[10px] border border-[#e4e4e7] bg-white px-3 py-2.5 text-left',
        selected && 'ring-2 ring-blue-400',
      )}
    >
      {hasInput && (
        <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      )}

      {healthWarning && (
        <div
          title={healthWarning}
          className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white"
        >
          !
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-[#a1a1aa]" aria-hidden="true" />
        <span className="text-[10px] tracking-widest text-[#a1a1aa] uppercase">
          {t(meta.labelKey, meta.label)}
        </span>
      </div>

      <p className="mt-1 text-[13px] leading-snug break-words text-[#18181b]">
        {preview}
      </p>
      {note && <p className="mt-0.5 text-[11px] text-[#a1a1aa]">{note}</p>}

      {outputs.map((output, i) => (
        <Handle
          key={output.id}
          id={output.id}
          type="source"
          position={Position.Bottom}
          style={{ ...HANDLE_STYLE, left: handleOffset(i, outputs.length) }}
        />
      ))}

      {outputs.length > 1 && (
        <div className="pointer-events-none absolute top-full left-0 w-full">
          {outputs.map((output, i) =>
            output.label ? (
              <span
                key={output.id}
                className="absolute mt-1.5 max-w-[90px] -translate-x-1/2 truncate text-[10px] text-[#71717a]"
                style={{ left: handleOffset(i, outputs.length) }}
              >
                {output.label}
              </span>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

import type { DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlowNodeType } from '@/api/flows.api';
import { InfoTip } from '@/components/shared/info-tip';
import { cn } from '@/lib/utils';
import { NODE_TYPE_META, PALETTE_NODE_TYPES } from './node-types';
import { NODE_DRAG_MIME } from './use-flow-editor';

interface NodePaletteProps {
  /** A flow starts once — the trigger tile locks after the first one is placed. */
  triggerPlaced: boolean;
}

function PaletteTile({
  nodeType,
  disabled,
}: {
  nodeType: FlowNodeType;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const meta = NODE_TYPE_META[nodeType];
  const Icon = meta.icon;

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData(NODE_DRAG_MIME, nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      draggable={!disabled}
      onDragStart={disabled ? undefined : handleDragStart}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-2 text-[12px] text-[#18181b]',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-grab hover:border-[#a1a1aa] active:cursor-grabbing',
      )}
    >
      <Icon className="size-3.5 shrink-0 text-[#a1a1aa]" aria-hidden="true" />
      <span className="truncate">{t(meta.labelKey, meta.label)}</span>
      {disabled && (
        <InfoTip
          className="ml-auto"
          content={t(
            'flows.palette.trigger_placed',
            'A flow starts at one trigger only. Select the trigger step to change how it fires.',
          )}
        />
      )}
    </div>
  );
}

/** The left rail of draggable steps. */
export function NodePalette({ triggerPlaced }: NodePaletteProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex w-[200px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-[#e4e4e7] bg-[#fafafa] p-3">
      <p className="text-[11px] leading-snug text-[#71717a]">
        {t(
          'flows.palette.hint',
          'Drag a step onto the canvas, then connect it.',
        )}
      </p>
      {PALETTE_NODE_TYPES.map((nodeType) => (
        <PaletteTile
          key={nodeType}
          nodeType={nodeType}
          disabled={nodeType === 'trigger' && triggerPlaced}
        />
      ))}
    </aside>
  );
}

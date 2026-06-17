import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface InfoTipProps {
  /** The hint content — plain text now; rich mode may hold media/links later. */
  content: ReactNode;
  /**
   * `rich` renders through HoverCard (interactive content: videos, links,
   * screenshots); default Tooltip is text-only but lighter.
   */
  rich?: boolean;
  /** Custom trigger; defaults to a small ⓘ icon. */
  children?: ReactNode;
  /** Extra classes for the trigger wrapper (e.g. w-full for block triggers). */
  className?: string;
}

/**
 * The one way we attach explanatory hints (and, later, walkthrough videos) to
 * UI: wrap a trigger — or use the default ⓘ — and pass the content. Using a
 * single component means upgrading a hint from text to video is a prop flip,
 * not a refactor.
 */
export function InfoTip({
  content,
  rich = false,
  children,
  className,
}: InfoTipProps) {
  const trigger = children ?? (
    <Info
      className="text-muted-foreground hover:text-foreground inline size-3.5 align-text-top"
      aria-hidden="true"
    />
  );
  // tabIndex makes the hint keyboard-reachable even when it wraps a disabled
  // control (Radix opens tooltips/cards on focus).
  const wrapperProps = {
    tabIndex: 0,
    className: cn('inline-flex cursor-help items-center', className),
  };

  if (rich) {
    return (
      <HoverCard openDelay={150}>
        <HoverCardTrigger asChild>
          <span {...wrapperProps}>{trigger}</span>
        </HoverCardTrigger>
        <HoverCardContent className="text-sm">{content}</HoverCardContent>
      </HoverCard>
    );
  }
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span {...wrapperProps}>{trigger}</span>
        </TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

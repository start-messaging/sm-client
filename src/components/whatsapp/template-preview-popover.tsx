import { useRef, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { hydrateTemplate } from '@/lib/template-utils';
import type { TemplateComponent } from '@/api/templates.api';
import {
  TemplatePreviewButtons,
  TemplatePreviewMedia,
} from './template-preview-buttons';

interface Props {
  components: TemplateComponent[];
  children: React.ReactNode;
}

export function TemplatePreviewPopover({ components, children }: Props) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 80);
  }

  const header = components.find((c) => c.type === 'HEADER');
  const footer = components.find((c) => c.type === 'FOOTER');
  const buttons = components.find((c) => c.type === 'BUTTONS');
  const hydratedBody = hydrateTemplate(components);
  const handle = header?.example?.header_handle?.[0];
  const mediaUrl =
    header?.link || (handle?.startsWith('http') ? handle : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className="inline-flex"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3"
        side="right"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <div className="rounded-lg bg-[#d9fdd3] p-3 text-sm shadow-sm space-y-1.5">
          {header?.format && header.format !== 'TEXT' && (
            <TemplatePreviewMedia
              format={header.format}
              url={mediaUrl}
              compact
            />
          )}
          {header?.format === 'TEXT' && header.text && (
            <p className="font-semibold text-[#111b21]">{header.text}</p>
          )}
          {hydratedBody && (
            <p className="text-[#111b21] whitespace-pre-wrap">{hydratedBody}</p>
          )}
          {footer?.text && (
            <p className="text-xs text-[#667781]">{footer.text}</p>
          )}
          {buttons?.buttons && buttons.buttons.length > 0 && (
            <TemplatePreviewButtons buttons={buttons.buttons} compact />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

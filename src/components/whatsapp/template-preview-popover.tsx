import { useRef, useState } from 'react';
import { Image, Video, FileText } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { hydrateTemplate } from '@/lib/template-utils';
import type { TemplateComponent } from '@/api/templates.api';

interface Props {
  components: TemplateComponent[];
  children: React.ReactNode;
}

function MediaPlaceholder({ format }: { format: string }) {
  const Icon =
    format === 'VIDEO' ? Video : format === 'DOCUMENT' ? FileText : Image;
  return (
    <div className="bg-[#f4f4f5] rounded-lg flex items-center justify-center h-28 mb-2">
      <Icon className="size-8 text-[#a1a1aa]" />
    </div>
  );
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
            <MediaPlaceholder format={header.format} />
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
            <div className="pt-1 flex flex-wrap gap-1">
              {buttons.buttons.map((btn, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[#00a884] px-2 py-0.5 text-xs text-[#00a884]"
                >
                  {btn.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

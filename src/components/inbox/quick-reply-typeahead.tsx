import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useQuickReplies } from '@/api/hooks/use-quick-replies';
import type { QuickReply } from '@/types/api';

export interface QuickReplyTypeaheadProps {
  slug: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (body: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

/**
 * Composer textarea with `/` quick-reply typeahead (Popover + Command).
 */
export function QuickReplyTypeahead({
  slug,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  disabled,
  onKeyDown,
}: QuickReplyTypeaheadProps) {
  const { t } = useTranslation();
  const { data: replies } = useQuickReplies(slug);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isSlashMode = value.startsWith('/');
  const query = isSlashMode ? value.slice(1).toLowerCase() : '';

  const filtered: QuickReply[] = isSlashMode
    ? (replies ?? []).filter(
        (qr) =>
          qr.shortcut.toLowerCase().startsWith(query) ||
          qr.title.toLowerCase().includes(query),
      )
    : [];

  const open = isSlashMode && filtered.length > 0 && !dismissed;

  function pick(qr: QuickReply) {
    onChange(qr.body);
    onSelect?.(qr.body);
    setDismissed(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setDismissed(true);
      return;
    }
    onKeyDown?.(e);
  }

  function handleChange(val: string) {
    if (dismissed) setDismissed(false);
    onChange(val);
  }

  return (
    <Popover open={open} onOpenChange={(o) => !o && setDismissed(true)}>
      <PopoverAnchor asChild>
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ?? t('settings.quickReplies.typeaheadPlaceholder')
          }
          disabled={disabled}
          className={className}
        />
      </PopoverAnchor>

      <PopoverContent
        className="w-72 p-0"
        side="top"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>
                {t('settings.quickReplies.typeaheadEmpty')}
              </CommandEmpty>
            ) : (
              <CommandGroup
                heading={t('settings.quickReplies.typeaheadHeading')}
              >
                {filtered.map((qr) => (
                  <CommandItem
                    key={qr.id}
                    value={qr.shortcut}
                    onSelect={() => pick(qr)}
                  >
                    <span className="text-blue-600 dark:text-blue-400 mr-2 font-mono text-xs">
                      /{qr.shortcut}
                    </span>
                    <span className="truncate">{qr.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

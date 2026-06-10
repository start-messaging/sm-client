import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PublicCountry } from '@/types/api';

/** ISO alpha-2 → flag emoji via regional-indicator codepoints (no assets). */
function flagOf(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

interface Props {
  countries: PublicCountry[];
  value: string;
  onChange: (code: string) => void;
}

/** Searchable country picker (flag · name · dial code) for the mobile step. */
export function CountryCombobox({ countries, value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = countries.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          id="country"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span>{flagOf(selected.code)}</span>
              <span className="truncate">{selected.name}</span>
              <span className="text-muted-foreground" dir="ltr">
                {selected.dialCode}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('onboarding.mobile.countryPlaceholder')}
            </span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={t('onboarding.mobile.searchCountry')} />
          <CommandList>
            <CommandEmpty>{t('onboarding.mobile.noCountry')}</CommandEmpty>
            <CommandGroup>
              {countries.map((c) => (
                <CommandItem
                  key={c.code}
                  // Searchable by name, code and dial code.
                  value={`${c.name} ${c.code} ${c.dialCode}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <span>{flagOf(c.code)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground" dir="ltr">
                    {c.dialCode}
                  </span>
                  <Check
                    className={cn(
                      'size-4',
                      value === c.code ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

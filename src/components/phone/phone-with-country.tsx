import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from 'lucide-react';
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
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

// ---------------------------------------------------------------------------
// Country dial-code registry
// ---------------------------------------------------------------------------

export interface DialCountry {
  /** ISO 3166-1 alpha-2 */
  code: string;
  /** Without leading + */
  dialCode: string;
  name: string;
}

/** Derive a flag emoji from an ISO-3166-1 alpha-2 code. */
export function toFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (ch) =>
      String.fromCodePoint(0x1f1e6 - 65 + ch.charCodeAt(0)),
    );
}

export const DIAL_COUNTRIES: DialCountry[] = [
  // South Asia
  { code: 'IN', dialCode: '91', name: 'India' },
  { code: 'PK', dialCode: '92', name: 'Pakistan' },
  { code: 'BD', dialCode: '880', name: 'Bangladesh' },
  { code: 'LK', dialCode: '94', name: 'Sri Lanka' },
  { code: 'NP', dialCode: '977', name: 'Nepal' },
  { code: 'BT', dialCode: '975', name: 'Bhutan' },
  { code: 'MV', dialCode: '960', name: 'Maldives' },
  { code: 'AF', dialCode: '93', name: 'Afghanistan' },
  // Southeast Asia
  { code: 'SG', dialCode: '65', name: 'Singapore' },
  { code: 'MY', dialCode: '60', name: 'Malaysia' },
  { code: 'ID', dialCode: '62', name: 'Indonesia' },
  { code: 'PH', dialCode: '63', name: 'Philippines' },
  { code: 'TH', dialCode: '66', name: 'Thailand' },
  { code: 'VN', dialCode: '84', name: 'Vietnam' },
  { code: 'MM', dialCode: '95', name: 'Myanmar' },
  { code: 'KH', dialCode: '855', name: 'Cambodia' },
  { code: 'LA', dialCode: '856', name: 'Laos' },
  { code: 'BN', dialCode: '673', name: 'Brunei' },
  // East Asia
  { code: 'CN', dialCode: '86', name: 'China' },
  { code: 'JP', dialCode: '81', name: 'Japan' },
  { code: 'KR', dialCode: '82', name: 'South Korea' },
  { code: 'HK', dialCode: '852', name: 'Hong Kong' },
  { code: 'TW', dialCode: '886', name: 'Taiwan' },
  // Middle East
  { code: 'AE', dialCode: '971', name: 'United Arab Emirates' },
  { code: 'SA', dialCode: '966', name: 'Saudi Arabia' },
  { code: 'KW', dialCode: '965', name: 'Kuwait' },
  { code: 'QA', dialCode: '974', name: 'Qatar' },
  { code: 'BH', dialCode: '973', name: 'Bahrain' },
  { code: 'OM', dialCode: '968', name: 'Oman' },
  { code: 'JO', dialCode: '962', name: 'Jordan' },
  { code: 'LB', dialCode: '961', name: 'Lebanon' },
  { code: 'IQ', dialCode: '964', name: 'Iraq' },
  { code: 'IL', dialCode: '972', name: 'Israel' },
  { code: 'TR', dialCode: '90', name: 'Turkey' },
  { code: 'IR', dialCode: '98', name: 'Iran' },
  { code: 'YE', dialCode: '967', name: 'Yemen' },
  // Africa
  { code: 'NG', dialCode: '234', name: 'Nigeria' },
  { code: 'ZA', dialCode: '27', name: 'South Africa' },
  { code: 'EG', dialCode: '20', name: 'Egypt' },
  { code: 'KE', dialCode: '254', name: 'Kenya' },
  { code: 'GH', dialCode: '233', name: 'Ghana' },
  { code: 'ET', dialCode: '251', name: 'Ethiopia' },
  { code: 'TZ', dialCode: '255', name: 'Tanzania' },
  { code: 'UG', dialCode: '256', name: 'Uganda' },
  { code: 'DZ', dialCode: '213', name: 'Algeria' },
  { code: 'MA', dialCode: '212', name: 'Morocco' },
  { code: 'TN', dialCode: '216', name: 'Tunisia' },
  { code: 'LY', dialCode: '218', name: 'Libya' },
  { code: 'SD', dialCode: '249', name: 'Sudan' },
  { code: 'SN', dialCode: '221', name: 'Senegal' },
  { code: 'CI', dialCode: '225', name: "Côte d'Ivoire" },
  { code: 'CM', dialCode: '237', name: 'Cameroon' },
  { code: 'ZW', dialCode: '263', name: 'Zimbabwe' },
  { code: 'ZM', dialCode: '260', name: 'Zambia' },
  { code: 'AO', dialCode: '244', name: 'Angola' },
  { code: 'MZ', dialCode: '258', name: 'Mozambique' },
  // Europe
  { code: 'GB', dialCode: '44', name: 'United Kingdom' },
  { code: 'DE', dialCode: '49', name: 'Germany' },
  { code: 'FR', dialCode: '33', name: 'France' },
  { code: 'IT', dialCode: '39', name: 'Italy' },
  { code: 'ES', dialCode: '34', name: 'Spain' },
  { code: 'PT', dialCode: '351', name: 'Portugal' },
  { code: 'NL', dialCode: '31', name: 'Netherlands' },
  { code: 'BE', dialCode: '32', name: 'Belgium' },
  { code: 'CH', dialCode: '41', name: 'Switzerland' },
  { code: 'AT', dialCode: '43', name: 'Austria' },
  { code: 'SE', dialCode: '46', name: 'Sweden' },
  { code: 'NO', dialCode: '47', name: 'Norway' },
  { code: 'DK', dialCode: '45', name: 'Denmark' },
  { code: 'FI', dialCode: '358', name: 'Finland' },
  { code: 'PL', dialCode: '48', name: 'Poland' },
  { code: 'CZ', dialCode: '420', name: 'Czech Republic' },
  { code: 'HU', dialCode: '36', name: 'Hungary' },
  { code: 'RO', dialCode: '40', name: 'Romania' },
  { code: 'GR', dialCode: '30', name: 'Greece' },
  { code: 'RU', dialCode: '7', name: 'Russia' },
  { code: 'UA', dialCode: '380', name: 'Ukraine' },
  { code: 'IE', dialCode: '353', name: 'Ireland' },
  // Americas
  { code: 'US', dialCode: '1', name: 'United States' },
  { code: 'CA', dialCode: '1', name: 'Canada' },
  { code: 'MX', dialCode: '52', name: 'Mexico' },
  { code: 'BR', dialCode: '55', name: 'Brazil' },
  { code: 'AR', dialCode: '54', name: 'Argentina' },
  { code: 'CL', dialCode: '56', name: 'Chile' },
  { code: 'CO', dialCode: '57', name: 'Colombia' },
  { code: 'PE', dialCode: '51', name: 'Peru' },
  { code: 'VE', dialCode: '58', name: 'Venezuela' },
  { code: 'EC', dialCode: '593', name: 'Ecuador' },
  // Oceania
  { code: 'AU', dialCode: '61', name: 'Australia' },
  { code: 'NZ', dialCode: '64', name: 'New Zealand' },
];

/** Find a country by ISO alpha-2 code. Falls back to India. */
export function findCountryByCode(isoCode: string): DialCountry {
  return (
    DIAL_COUNTRIES.find(
      (c) => c.code.toLowerCase() === isoCode?.toLowerCase(),
    ) ?? DIAL_COUNTRIES[0]
  );
}

// ---------------------------------------------------------------------------
// PhoneWithCountry component
// ---------------------------------------------------------------------------

export interface PhoneWithCountryProps {
  /** Controlled: current dial code without +, e.g. "91". */
  dialCode: string;
  onDialCodeChange: (dialCode: string) => void;
  /** Controlled: national number string (may include spaces from display). */
  nationalNumber: string;
  onNationalNumberChange: (value: string) => void;
  disabled?: boolean;
  /** Optional id for the national-number input (label htmlFor). */
  inputId?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

export function PhoneWithCountry({
  dialCode,
  onDialCodeChange,
  nationalNumber,
  onNationalNumberChange,
  disabled,
  inputId = 'conv-national-number',
  'aria-invalid': ariaInvalid,
}: PhoneWithCountryProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Resolve the displayed country from the current dialCode prop
  const country =
    DIAL_COUNTRIES.find((c) => c.dialCode === dialCode) ?? DIAL_COUNTRIES[0];

  const handleCountrySelect = (selected: DialCountry) => {
    onDialCodeChange(selected.dialCode);
    setOpen(false);
  };

  const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accept digits and spaces; strip other chars silently
    const sanitised = e.target.value.replace(/[^\d\s]/g, '');
    onNationalNumberChange(sanitised);
  };

  const flag = toFlagEmoji(country.code);

  return (
    <InputGroup aria-invalid={ariaInvalid}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <InputGroupButton
            role="combobox"
            aria-expanded={open}
            aria-label={t('inbox.newConversation.dialCodeLabel')}
            disabled={disabled}
            className="gap-1 pl-2 pr-1.5 font-normal tabular-nums"
          >
            <span aria-hidden="true">{flag}</span>
            <span className="text-muted-foreground">+{dialCode}</span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </InputGroupButton>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('inbox.newConversation.searchCountry')}
            />
            <CommandList>
              <CommandEmpty>
                {t('inbox.newConversation.noCountryFound')}
              </CommandEmpty>
              <CommandGroup>
                {DIAL_COUNTRIES.map((c) => (
                  <CommandItem
                    key={`${c.code}-${c.dialCode}`}
                    value={`${c.name} +${c.dialCode} ${c.code}`}
                    data-checked={c.code === country.code}
                    onSelect={() => handleCountrySelect(c)}
                    className="cursor-pointer"
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      {toFlagEmoji(c.code)}
                    </span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      +{c.dialCode}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <InputGroupInput
        id={inputId}
        type="tel"
        inputMode="numeric"
        placeholder={t('inbox.newConversation.nationalNumberPlaceholder')}
        value={nationalNumber}
        onChange={handleNationalChange}
        disabled={disabled}
        aria-label={t('inbox.newConversation.nationalNumber')}
        aria-invalid={ariaInvalid}
      />
    </InputGroup>
  );
}

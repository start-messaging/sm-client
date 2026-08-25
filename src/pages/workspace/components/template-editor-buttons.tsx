import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TemplateButton } from '@/api/templates.api';

const MAX_BUTTONS = 3;

const BUTTON_TYPES: { value: TemplateButton['type']; label: string }[] = [
  { value: 'QUICK_REPLY', label: 'Quick reply' },
  { value: 'URL', label: 'Visit website (URL)' },
  { value: 'PHONE_NUMBER', label: 'Call phone number' },
];

function urlHasVariable(url: string): boolean {
  return /\{\{1\}\}/.test(url);
}

function hasMixedTypes(buttons: TemplateButton[]): boolean {
  const hasQr = buttons.some((b) => b.type === 'QUICK_REPLY');
  const hasCta = buttons.some(
    (b) => b.type === 'URL' || b.type === 'PHONE_NUMBER',
  );
  return hasQr && hasCta;
}

interface TemplateEditorButtonsProps {
  value: TemplateButton[];
  onChange: (buttons: TemplateButton[]) => void;
  errors?: string[];
}

export function TemplateEditorButtons({
  value,
  onChange,
  errors = [],
}: TemplateEditorButtonsProps) {
  const { t } = useTranslation();

  function updateButton(index: number, patch: Partial<TemplateButton>) {
    onChange(value.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function changeType(index: number, type: TemplateButton['type']) {
    onChange(
      value.map((b, i) =>
        i === index
          ? {
              type,
              text: b.text,
              url: undefined,
              phone_number: undefined,
              example: undefined,
            }
          : b,
      ),
    );
  }

  function addButton() {
    if (value.length >= MAX_BUTTONS) return;
    onChange([...value, { type: 'QUICK_REPLY', text: '' }]);
  }

  function removeButton(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const mixed = hasMixedTypes(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <FieldLabel>
          {t('templates.buttons_section_title')}{' '}
          <span className="text-muted-foreground font-normal">
            ({t('templates.create.buttons.optional', 'optional, max 3')})
          </span>
        </FieldLabel>
        {value.length < MAX_BUTTONS ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addButton}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 size-3" />
            {t('templates.add_button')}
          </Button>
        ) : (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {t('templates.button_limit_hint')}
          </span>
        )}
      </div>

      {value.length === 0 && (
        <p className="text-muted-foreground text-xs">
          {t(
            'templates.create.buttons.hint',
            'Add up to 3 buttons — quick replies, website links, or a call number.',
          )}
        </p>
      )}

      {mixed && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {t('templates.button_mix_warning')}
        </p>
      )}

      {value.map((btn, idx) => (
        <div
          key={idx}
          className="bg-muted/30 flex flex-col gap-2 rounded-md border p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              {t('templates.create.buttons.buttonN', 'Button {{n}}', {
                n: idx + 1,
              })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => removeButton(idx)}
              aria-label={t('templates.create.buttons.remove', 'Remove button')}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor={`btn-type-${idx}`} className="text-xs">
              {t('templates.create.buttons.type', 'Type')}
            </FieldLabel>
            <Select
              value={btn.type}
              onValueChange={(v) =>
                changeType(idx, v as TemplateButton['type'])
              }
            >
              <SelectTrigger id={`btn-type-${idx}`} className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_TYPES.map((bt) => (
                  <SelectItem key={bt.value} value={bt.value}>
                    {bt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor={`btn-text-${idx}`} className="text-xs">
              {t('templates.create.buttons.buttonText', 'Button label')}
            </FieldLabel>
            <Input
              id={`btn-text-${idx}`}
              className="h-8 text-xs"
              maxLength={20}
              value={btn.text}
              onChange={(e) => updateButton(idx, { text: e.target.value })}
            />
          </div>

          {btn.type === 'URL' && (
            <>
              <Input
                className="h-8 text-xs"
                placeholder="https://example.com/track/{{1}}"
                value={btn.url ?? ''}
                onChange={(e) => updateButton(idx, { url: e.target.value })}
              />
              {urlHasVariable(btn.url ?? '') && (
                <Input
                  className="h-8 text-xs"
                  placeholder="ORDER123"
                  value={btn.example?.[0] ?? ''}
                  onChange={(e) =>
                    updateButton(idx, { example: [e.target.value] })
                  }
                />
              )}
            </>
          )}

          {btn.type === 'PHONE_NUMBER' && (
            <Input
              className="h-8 text-xs"
              placeholder="+919876543210"
              value={btn.phone_number ?? ''}
              onChange={(e) =>
                updateButton(idx, { phone_number: e.target.value })
              }
            />
          )}

          {errors[idx] && <FieldError errors={[{ message: errors[idx] }]} />}
        </div>
      ))}
    </div>
  );
}

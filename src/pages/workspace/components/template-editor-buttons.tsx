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
import { InfoTip } from '@/components/shared/info-tip';
import { useMetaFlows } from '@/api/hooks/use-meta-flows';
import type { TemplateButton, TemplateButtonType } from '@/api/templates.api';

const MAX_BUTTONS = 10;

const CALLING_MANAGER =
  'https://business.facebook.com/latest/whatsapp_manager/phone_numbers';

const BUTTON_TYPES: { value: TemplateButtonType; labelKey: string }[] = [
  { value: 'QUICK_REPLY', labelKey: 'templates.create.buttons.types.QUICK_REPLY' },
  { value: 'URL', labelKey: 'templates.create.buttons.types.URL' },
  { value: 'PHONE_NUMBER', labelKey: 'templates.create.buttons.types.PHONE_NUMBER' },
  { value: 'VOICE_CALL', labelKey: 'templates.create.buttons.types.VOICE_CALL' },
  { value: 'VIDEO_CALL', labelKey: 'templates.create.buttons.types.VIDEO_CALL' },
  { value: 'COPY_CODE', labelKey: 'templates.create.buttons.types.COPY_CODE' },
  { value: 'FLOW', labelKey: 'templates.create.buttons.types.FLOW' },
  { value: 'REQUEST_CONTACT_INFO', labelKey: 'templates.create.buttons.types.REQUEST_CONTACT_INFO' },
  { value: 'CATALOG', labelKey: 'templates.create.buttons.types.CATALOG' },
  { value: 'MPM', labelKey: 'templates.create.buttons.types.MPM' },
];

const FIXED_LABEL: TemplateButtonType[] = [
  'COPY_CODE',
  'REQUEST_CONTACT_INFO',
  'CATALOG',
  'MPM',
];

function urlHasVariable(url: string): boolean {
  return /\{\{1\}\}/.test(url);
}

function emptyButton(type: TemplateButtonType): TemplateButton {
  return {
    type,
    text: '',
    url: undefined,
    phone_number: undefined,
    example: undefined,
    flow_id: undefined,
    icon: undefined,
    ttl_minutes: type === 'VOICE_CALL' || type === 'VIDEO_CALL' ? 10080 : undefined,
  };
}

function isGroupedQuickReplies(buttons: TemplateButton[]): boolean {
  const positions = buttons
    .map((b, i) => (b.type === 'QUICK_REPLY' ? i : -1))
    .filter((i) => i !== -1);
  if (positions.length <= 1) return true;
  const first = positions[0] ?? 0;
  const last = positions[positions.length - 1] ?? 0;
  return last - first + 1 === positions.length;
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
  const { data: flows = [] } = useMetaFlows();
  const publishedFlows = flows.filter((f) => f.status === 'PUBLISHED');

  function updateButton(index: number, patch: Partial<TemplateButton>) {
    onChange(value.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function changeType(index: number, type: TemplateButtonType) {
    onChange(value.map((b, i) => (i === index ? emptyButton(type) : b)));
  }

  function addButton() {
    if (value.length >= MAX_BUTTONS) return;
    onChange([...value, emptyButton('QUICK_REPLY')]);
  }

  function removeButton(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const mixedUngrouped = !isGroupedQuickReplies(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <FieldLabel>
          {t('templates.buttons_section_title')}{' '}
          <span className="text-muted-foreground font-normal">
            ({t('templates.create.buttons.optional')})
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
          {t('templates.create.buttons.hint')}
        </p>
      )}

      {mixedUngrouped && (
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
              {t('templates.create.buttons.buttonN', { n: idx + 1 })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => removeButton(idx)}
              aria-label={t('templates.create.buttons.remove')}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor={`btn-type-${idx}`} className="text-xs">
              {t('templates.create.buttons.type')}
            </FieldLabel>
            <Select
              value={btn.type}
              onValueChange={(v) => changeType(idx, v as TemplateButtonType)}
            >
              <SelectTrigger id={`btn-type-${idx}`} className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_TYPES.map((bt) => (
                  <SelectItem key={bt.value} value={bt.value}>
                    {t(bt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!FIXED_LABEL.includes(btn.type) && (
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor={`btn-text-${idx}`} className="text-xs">
                {t('templates.create.buttons.buttonText')}
              </FieldLabel>
              <Input
                id={`btn-text-${idx}`}
                className="h-8 text-xs"
                maxLength={25}
                value={btn.text}
                onChange={(e) => updateButton(idx, { text: e.target.value })}
              />
            </div>
          )}

          {btn.type === 'URL' && (
            <UrlButtonFields
              btn={btn}
              onChange={(patch) => updateButton(idx, patch)}
            />
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

          {(btn.type === 'VOICE_CALL' || btn.type === 'VIDEO_CALL') && (
            <CallButtonFields
              btn={btn}
              onChange={(patch) => updateButton(idx, patch)}
            />
          )}

          {btn.type === 'COPY_CODE' && (
            <div className="flex flex-col gap-1">
              <FieldLabel className="text-xs">
                {t('templates.create.buttons.offerCode')}
              </FieldLabel>
              <Input
                className="h-8 text-xs"
                maxLength={20}
                placeholder="SAVE20"
                value={btn.example?.[0] ?? ''}
                onChange={(e) =>
                  updateButton(idx, { example: [e.target.value] })
                }
              />
            </div>
          )}

          {btn.type === 'FLOW' && (
            <FlowButtonFields
              btn={btn}
              flows={publishedFlows}
              onChange={(patch) => updateButton(idx, patch)}
            />
          )}

          {(btn.type === 'CATALOG' || btn.type === 'MPM') && (
            <p className="text-muted-foreground text-xs">
              {t('templates.create.buttons.catalogHint')}
            </p>
          )}

          {errors[idx] && <FieldError errors={[{ message: errors[idx] }]} />}
        </div>
      ))}
    </div>
  );
}

function UrlButtonFields({
  btn,
  onChange,
}: {
  btn: TemplateButton;
  onChange: (patch: Partial<TemplateButton>) => void;
}) {
  const { t } = useTranslation();
  const dynamic = urlHasVariable(btn.url ?? '');

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-md border px-2 py-1 text-xs ${
            !dynamic
              ? 'border-[#0e8a6a] bg-[#e8f5f2] text-[#0e8a6a]'
              : 'border-border text-muted-foreground'
          }`}
          onClick={() =>
            onChange({
              url: (btn.url ?? '').replace(/\{\{1\}\}/g, '').replace(/\/$/, ''),
              example: undefined,
            })
          }
        >
          {t('templates.create.buttons.urlStatic')}
        </button>
        <button
          type="button"
          className={`rounded-md border px-2 py-1 text-xs ${
            dynamic
              ? 'border-[#0e8a6a] bg-[#e8f5f2] text-[#0e8a6a]'
              : 'border-border text-muted-foreground'
          }`}
          onClick={() => {
            const base = (btn.url ?? 'https://example.com/').replace(
              /\{\{1\}\}/g,
              '',
            );
            onChange({
              url: `${base.replace(/\/?$/, '/')}{{1}}`,
            });
          }}
        >
          {t('templates.create.buttons.urlDynamic')}
        </button>
      </div>
      <Input
        className="h-8 text-xs"
        placeholder={
          dynamic
            ? 'https://example.com/track/{{1}}'
            : 'https://example.com/offers'
        }
        value={btn.url ?? ''}
        onChange={(e) => onChange({ url: e.target.value })}
      />
      {dynamic && (
        <Input
          className="h-8 text-xs"
          placeholder="ORDER123"
          value={btn.example?.[0] ?? ''}
          onChange={(e) => onChange({ example: [e.target.value] })}
        />
      )}
    </>
  );
}

function CallButtonFields({
  btn,
  onChange,
}: {
  btn: TemplateButton;
  onChange: (patch: Partial<TemplateButton>) => void;
}) {
  const { t } = useTranslation();
  const days = Math.min(30, Math.max(1, Math.round((btn.ttl_minutes ?? 10080) / 1440)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <FieldLabel className="text-xs">
          {t('templates.create.buttons.callActiveDays')}
        </FieldLabel>
        <InfoTip content={t('templates.create.buttons.callHint')} rich />
      </div>
      <Input
        type="number"
        min={1}
        max={30}
        className="h-8 w-24 text-xs"
        value={days}
        onChange={(e) =>
          onChange({
            ttl_minutes: Math.min(30, Math.max(1, Number(e.target.value) || 1)) * 1440,
          })
        }
      />
      <a
        href={CALLING_MANAGER}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-[#0e8a6a] underline-offset-4 hover:underline"
      >
        {t('templates.create.buttons.callManagerCta')}
      </a>
    </div>
  );
}

function FlowButtonFields({
  btn,
  flows,
  onChange,
}: {
  btn: TemplateButton;
  flows: Array<{ metaFlowId: string; name: string }>;
  onChange: (patch: Partial<TemplateButton>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <FieldLabel className="text-xs">
          {t('templates.create.buttons.flowIcon')}
        </FieldLabel>
        <Select
          value={btn.icon ?? '__default__'}
          onValueChange={(v) =>
            onChange({
              icon:
                v === '__default__'
                  ? undefined
                  : (v as NonNullable<TemplateButton['icon']>),
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">
              {t('templates.create.buttons.flowIconDefault')}
            </SelectItem>
            <SelectItem value="DOCUMENT">
              {t('templates.create.buttons.flowIconDocument')}
            </SelectItem>
            <SelectItem value="PROMOTION">
              {t('templates.create.buttons.flowIconPromotion')}
            </SelectItem>
            <SelectItem value="REVIEW">
              {t('templates.create.buttons.flowIconReview')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <FieldLabel className="text-xs">
          {t('templates.create.buttons.flowSelect')}
        </FieldLabel>
        {flows.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {t('templates.create.buttons.flowEmpty')}
          </p>
        ) : (
          <Select
            value={btn.flow_id || undefined}
            onValueChange={(v) => onChange({ flow_id: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue
                placeholder={t('templates.create.buttons.flowSelect')}
              />
            </SelectTrigger>
            <SelectContent>
              {flows.map((f) => (
                <SelectItem key={f.metaFlowId} value={f.metaFlowId}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

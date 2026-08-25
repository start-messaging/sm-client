import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Grid2x2, Pause, Play, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import type { FlowStatus } from '@/api/flows.api';
import { cn } from '@/lib/utils';
import type { FlowIssue } from './use-flow-editor';

const STATUS_STYLE: Record<FlowStatus, string> = {
  draft: 'bg-[#f4f4f5] text-[#71717a]',
  active: 'bg-[#dcfce7] text-[#15803d]',
  inactive: 'bg-[#f4f4f5] text-[#71717a]',
};

interface EditorTopBarProps {
  slug: string;
  status: FlowStatus;
  name: string;
  onNameChange: (name: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  isActivating: boolean;
  isDeactivating: boolean;
  /** `chatbot_flows` entitlement — false shows the upgrade explanation instead. */
  canActivate: boolean;
  issues: FlowIssue[];
  onAutoArrange: () => void;
  onSave: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}

function FlowNameField({
  name,
  onNameChange,
}: Pick<EditorTopBarProps, 'name' | 'onNameChange'>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== name) onNameChange(next);
    else setDraft(name);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="max-w-[280px] truncate rounded-md px-1.5 py-1 text-[14px] font-semibold text-[#18181b] hover:bg-[#f4f4f5]"
        title={t('flows.rename', 'Rename flow')}
      >
        {name}
      </button>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      aria-label={t('flows.rename', 'Rename flow')}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') {
          setDraft(name);
          setEditing(false);
        }
      }}
      className="h-8 w-[240px] text-[14px] font-semibold"
    />
  );
}

/** The 52px editor chrome: navigation, flow identity, and the save/publish rail. */
export function EditorTopBar({
  slug,
  status,
  name,
  onNameChange,
  isDirty,
  isSaving,
  isActivating,
  isDeactivating,
  canActivate,
  issues,
  onAutoArrange,
  onSave,
  onActivate,
  onDeactivate,
}: EditorTopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-[#e4e4e7] bg-white px-4">
      <Button variant="ghost" size="icon" className="size-8" asChild>
        <Link
          to={`/w/${slug}/automations`}
          aria-label={t('flows.back_to_list', 'Back to automations')}
        >
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <FlowNameField name={name} onNameChange={onNameChange} />

      <Badge className={cn('font-medium', STATUS_STYLE[status])}>
        {t(`flows.status_${status}`)}
      </Badge>

      {issues.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[#b91c1c] hover:bg-[#fef2f2] hover:text-[#b91c1c]"
            >
              <TriangleAlert className="mr-1.5 size-3.5" />
              {t('flows.issue.count', {
                count: issues.length,
                defaultValue: '{{count}} issues',
                defaultValue_one: '1 issue',
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <PopoverHeader>
              <PopoverTitle>
                {t('flows.issue.title', 'Before this flow can go live')}
              </PopoverTitle>
            </PopoverHeader>
            <ul className="flex flex-col gap-1.5">
              {issues.map((issue, index) => (
                <li
                  key={`${issue.nodeId ?? 'flow'}-${index}`}
                  className="text-[12px] text-[#71717a]"
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAutoArrange}>
          <Grid2x2 className="mr-1.5 size-3.5" />
          {t('flows.auto_arrange', 'Auto-arrange')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving && <Spinner className="mr-1.5 size-3.5" />}
          {t('common.save')}
        </Button>

        {status === 'active' ? (
          <Button size="sm" onClick={onDeactivate} disabled={isDeactivating}>
            {isDeactivating ? (
              <Spinner className="mr-1.5 size-3.5" />
            ) : (
              <Pause className="mr-1.5 size-3.5" />
            )}
            {t('flows.deactivate')}
          </Button>
        ) : canActivate ? (
          <Button size="sm" onClick={onActivate} disabled={isActivating}>
            {isActivating ? (
              <Spinner className="mr-1.5 size-3.5" />
            ) : (
              <Play className="mr-1.5 size-3.5" />
            )}
            {t('flows.activate')}
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary">
                <Play className="mr-1.5 size-3.5" />
                {t('flows.activate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <PopoverHeader>
                <PopoverTitle>{t('flows.plan_gate')}</PopoverTitle>
                <PopoverDescription className="text-[12px]">
                  {t(
                    'flows.plan_gate_body',
                    'You can keep building and saving this flow. Upgrade your plan to let it reply to contacts automatically.',
                  )}
                </PopoverDescription>
              </PopoverHeader>
              <Button size="sm" className="w-full" asChild>
                <Link to={`/w/${slug}/billing`}>
                  {t('billing.upgrade', 'Upgrade plan')}
                </Link>
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  useFlows,
  useCreateFlow,
  useActivateFlow,
  useDeactivateFlow,
  useDeleteFlow,
} from '@/api/hooks/use-flows';
import { hasFeature } from '@/lib/plan';
import { formatRelativeShort } from '@/lib/relative-time';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { WaFlow, FlowTriggerType } from '@/api/flows.api';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WaFlow['status'] }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-[6px] py-px rounded-full',
        status === 'active'
          ? 'bg-[#dcfce7] text-[#15803d]'
          : 'bg-[#f4f4f5] text-[#71717a]',
      )}
    >
      {t(`flows.status_${status}`)}
    </span>
  );
}

// ── Trigger label ─────────────────────────────────────────────────────────────

function TriggerCell({ flow }: { flow: WaFlow }) {
  const { t } = useTranslation();
  const base = t(`flows.trigger_${flow.triggerType}`);
  if (flow.triggerType === 'keyword' && flow.triggerKeywords.length > 0) {
    return (
      <span className="text-[13px] text-[#71717a]">
        {base}:{' '}
        <span className="font-mono text-[12px]">
          {flow.triggerKeywords.join(', ')}
        </span>
      </span>
    );
  }
  return <span className="text-[13px] text-[#71717a]">{base}</span>;
}

// ── Create flow dialog ────────────────────────────────────────────────────────

interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string;
}

function CreateFlowDialog({ open, onOpenChange, slug }: CreateFlowDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createMutation = useCreateFlow(slug);

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] =
    useState<FlowTriggerType>('first_message');
  const [keywords, setKeywords] = useState('');
  const [nameError, setNameError] = useState('');

  function reset() {
    setName('');
    setTriggerType('first_message');
    setKeywords('');
    setNameError('');
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('flows.name_required', 'Name is required'));
      return;
    }
    if (trimmed.length > 120) {
      setNameError(
        t('flows.name_too_long', 'Name must be 120 characters or fewer'),
      );
      return;
    }
    setNameError('');

    const triggerKeywords =
      triggerType === 'keyword'
        ? keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : undefined;

    try {
      const result = (await createMutation.mutateAsync({
        name: trimmed,
        triggerType,
        triggerKeywords,
      })) as WaFlow;
      handleOpenChange(false);
      navigate(`/w/${slug}/automations/${result.id}/edit`);
    } catch (err) {
      toast.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('flows.new_flow')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flow-name">{t('flows.name_label', 'Name')}</Label>
            <Input
              id="flow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('flows.name_placeholder', 'e.g. Welcome flow')}
              maxLength={120}
              autoFocus
            />
            {nameError && (
              <p className="text-[12px] text-destructive">{nameError}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('flows.trigger_label', 'Trigger')}</Label>
            <Select
              value={triggerType}
              onValueChange={(v) => setTriggerType(v as FlowTriggerType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first_message">
                  {t('flows.trigger_first_message')}
                </SelectItem>
                <SelectItem value="any_inbound">
                  {t('flows.trigger_any_inbound')}
                </SelectItem>
                <SelectItem value="keyword">
                  {t('flows.trigger_keyword')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === 'keyword' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="flow-keywords">
                {t('flows.keywords_label', 'Keywords')}
              </Label>
              <Textarea
                id="flow-keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder={t(
                  'flows.keywords_placeholder',
                  'hello, hi, start (comma-separated)',
                )}
                rows={2}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Spinner className="mr-1.5 size-3.5" />
              )}
              {t('flows.create_cta', 'Create flow')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AutomationsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ws = useCurrentWorkspace();

  const { data, isLoading } = useFlows(ws.slug);
  const activateMutation = useActivateFlow(ws.slug);
  const deactivateMutation = useDeactivateFlow(ws.slug);
  const deleteMutation = useDeleteFlow(ws.slug);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WaFlow | null>(null);

  const flows = data?.flows ?? [];
  const canActivate = hasFeature(ws, 'chatbot_flows');
  const editPath = (id: string) => `/w/${ws.slug}/automations/${id}/edit`;

  function handleActivate(id: string) {
    activateMutation.mutate(id, {
      onSuccess: () => toast.success(t('flows.activated', 'Flow activated')),
      onError: (err) => toast.error(err),
    });
  }

  function handleDeactivate(id: string) {
    deactivateMutation.mutate(id, {
      onSuccess: () =>
        toast.success(t('flows.deactivated', 'Flow deactivated')),
      onError: (err) => toast.error(err),
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('flows.deleted', 'Flow deleted'));
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(err);
        setDeleteTarget(null);
      },
    });
  }

  function isRowPending(flow: WaFlow): boolean {
    return (
      (activateMutation.isPending && activateMutation.variables === flow.id) ||
      (deactivateMutation.isPending &&
        deactivateMutation.variables === flow.id) ||
      (deleteMutation.isPending && deleteMutation.variables === flow.id)
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-5">
        {!canActivate && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <Info className="size-4 text-amber-600" />
            <AlertDescription>
              {t('flows.plan_gate_info')}
            </AlertDescription>
          </Alert>
        )}
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-[#18181b]">
            {t('flows.page_title')}
          </h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            {t('flows.new_flow')}
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <p className="text-[13px] text-[#71717a] flex items-center gap-2">
            <Spinner className="size-4" />
            {t('common.loading')}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && flows.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Zap className="text-[#a1a1aa] size-10" />
              <div>
                <p className="font-medium text-[#18181b]">
                  {t('flows.empty_title')}
                </p>
                <p className="text-[13px] text-[#71717a] mt-0.5">
                  {t('flows.empty_desc')}
                </p>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-3.5" />
                {t('flows.new_flow')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {!isLoading && flows.length > 0 && (
          <div className="rounded-[10px] border border-[#e4e4e7] bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#fafafa]">
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('flows.col_name', 'Name')}
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('flows.col_status', 'Status')}
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('flows.col_trigger', 'Trigger')}
                  </TableHead>
                  <TableHead className="text-[11px] font-medium text-[#a1a1aa]">
                    {t('flows.col_updated', 'Last updated')}
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((flow) => {
                  const pending = isRowPending(flow);
                  return (
                    <TableRow
                      key={flow.id}
                      className="hover:bg-[#fafafa]"
                      onClick={() => navigate(editPath(flow.id))}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell className="text-[13px] font-medium text-[#18181b]">
                        <Link
                          to={editPath(flow.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {flow.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={flow.status} />
                      </TableCell>
                      <TableCell>
                        <TriggerCell flow={flow} />
                      </TableCell>
                      <TableCell className="text-[13px] text-[#71717a]">
                        {formatRelativeShort(flow.updatedAt)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-[#a1a1aa] hover:text-[#18181b]"
                              disabled={pending}
                              aria-label={t('flows.actions', 'Actions')}
                            >
                              {pending ? (
                                <Spinner className="size-3.5" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => navigate(editPath(flow.id))}
                            >
                              {t('flows.edit')}
                            </DropdownMenuItem>
                            {(flow.status === 'draft' ||
                              flow.status === 'inactive') &&
                              (canActivate ? (
                                <DropdownMenuItem
                                  onSelect={() => handleActivate(flow.id)}
                                >
                                  {t('flows.activate')}
                                </DropdownMenuItem>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      disabled
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      {t('flows.activate')}
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    {t('flows.plan_gate')}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            {flow.status === 'active' && (
                              <DropdownMenuItem
                                onSelect={() => handleDeactivate(flow.id)}
                              >
                                {t('flows.deactivate')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setDeleteTarget(flow)}
                            >
                              {t('flows.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create dialog */}
        <CreateFlowDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          slug={ws.slug}
        />

        {/* Delete confirm */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('flows.delete_title', 'Delete this flow?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  'flows.delete_body',
                  '"{{name}}" will be permanently deleted. This cannot be undone.',
                  { name: deleteTarget?.name ?? '' },
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && (
                  <Spinner className="mr-1.5 size-3.5" />
                )}
                {t('flows.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

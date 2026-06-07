import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspaces, useServices } from '@/api/hooks/use-workspaces';
import { useSwitchWorkspace } from '@/api/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/**
 * Workspace picker. Selecting one calls switch-workspace (which re-mints the
 * token + resets the query cache so no data leaks across workspaces).
 * `useServices` is prefetched so the (future) create-workspace flow is instant.
 */
export function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const activeWorkspaceId = useAuthStore((s) => s.activeWorkspaceId);
  const { data: workspaces, isLoading } = useWorkspaces();
  useServices(); // warm the reference cache
  const switchWs = useSwitchWorkspace();

  const active = workspaces?.find((w) => w.id === activeWorkspaceId);
  const label = active?.name ?? t('shell.noWorkspace');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={isLoading || switchWs.isPending}
        >
          {(isLoading || switchWs.isPending) && <Spinner />}
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuLabel>{t('shell.switchWorkspace')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces?.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => {
              if (ws.id === activeWorkspaceId) return;
              switchWs.mutate(
                { workspaceId: ws.id, role: ws.role },
                { onError: (err) => toast.error(err) },
              );
            }}
          >
            <Check
              className={cn(
                'opacity-0',
                ws.id === activeWorkspaceId && 'opacity-100',
              )}
            />
            <span className="truncate">{ws.name}</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {ws.role}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Plus />
          {t('shell.createWorkspace')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

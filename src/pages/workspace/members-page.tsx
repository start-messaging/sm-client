import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useMembers,
  useRemoveMember,
  useResendInvite,
  useRevokeInvite,
  useUpdateMemberRole,
} from '@/api/hooks/use-members';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { planLimit } from '@/lib/plan';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_RANK, WorkspaceRole, type RosterMember } from '@/types/api';
import { InviteMemberDialog } from './components/invite-member-dialog';

const initials = (name: string, email: string) =>
  (name || email).slice(0, 2).toUpperCase();

export function MembersPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const myUserId = useAuthStore((s) => s.user?.id);
  const myRank = ROLE_RANK[ws.role];
  const canManage = myRank >= ROLE_RANK[WorkspaceRole.ADMIN];

  const { data, isLoading } = useMembers(ws.slug, ws.id);
  const updateRole = useUpdateMemberRole(ws.slug, ws.id);
  const removeMember = useRemoveMember(ws.slug, ws.id);
  const resendInvite = useResendInvite(ws.slug, ws.id);
  const revokeInvite = useRevokeInvite(ws.slug, ws.id);

  const [removing, setRemoving] = useState<RosterMember | null>(null);

  if (isLoading || !data) {
    return (
      <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
    );
  }

  // Roles I can assign / target — strictly below my own.
  const assignableRoles = (
    [
      WorkspaceRole.ADMIN,
      WorkspaceRole.MANAGER,
      WorkspaceRole.AGENT,
      WorkspaceRole.VIEWER,
    ] as const
  ).filter((r) => ROLE_RANK[r] < myRank);
  const canActOn = (m: RosterMember) =>
    canManage &&
    m.userId !== myUserId && // not myself
    m.role !== WorkspaceRole.OWNER &&
    ROLE_RANK[m.role] < myRank;

  // The member limit (UX-only; the server enforces). active members + pending.
  const maxMembers = planLimit(ws, 'max_members');
  const used = data.members.length + data.invitations.length;
  const atCap = maxMembers !== null && used >= maxMembers;

  const onRole = (m: RosterMember, role: WorkspaceRole) =>
    updateRole.mutate(
      { memberId: m.memberId, body: { role } },
      {
        onSuccess: () => toast.success(t('members.roleUpdated')),
        onError: (err) => toast.error(err),
      },
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('members.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {maxMembers !== null
              ? t('members.subtitleCount', { used, max: maxMembers })
              : t('members.subtitle')}
          </p>
        </div>
        {canManage ? (
          atCap ? (
            <Badge variant="outline">{t('members.atCap')}</Badge>
          ) : (
            <InviteMemberDialog
              slug={ws.slug}
              workspaceId={ws.id}
              myRole={ws.role}
            />
          )
        ) : null}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('members.cols.member')}</TableHead>
              <TableHead>{t('members.cols.role')}</TableHead>
              {canManage ? <TableHead className="w-12" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((m) => (
              <TableRow key={m.memberId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {initials(m.fullName, m.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{m.fullName || '—'}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {m.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      m.role === WorkspaceRole.OWNER ? 'default' : 'secondary'
                    }
                  >
                    {t(`roles.${m.role}`)}
                  </Badge>
                </TableCell>
                {canManage ? (
                  <TableCell>
                    {canActOn(m) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('members.actions')}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {t('members.changeRole')}
                          </DropdownMenuLabel>
                          {assignableRoles
                            .filter((r) => r !== m.role)
                            .map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onClick={() => onRole(m, r)}
                              >
                                {t(`roles.${r}`)}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemoving(m)}
                          >
                            {t('members.remove')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {data.invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('members.pendingTitle')}
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('members.cols.email')}</TableHead>
                <TableHead>{t('members.cols.role')}</TableHead>
                {canManage ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invitations.map((inv) => (
                <TableRow key={inv.invitationId}>
                  <TableCell className="font-mono text-sm">
                    {inv.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`roles.${inv.role}`)}</Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('members.actions')}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              resendInvite.mutate(inv.invitationId, {
                                onSuccess: () =>
                                  toast.success(t('members.resent')),
                                onError: (err) => toast.error(err),
                              })
                            }
                          >
                            {t('members.resend')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              revokeInvite.mutate(inv.invitationId, {
                                onSuccess: () =>
                                  toast.success(t('members.revoked')),
                                onError: (err) => toast.error(err),
                              })
                            }
                          >
                            {t('members.revoke')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('members.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('members.removeBody', {
                name: removing?.fullName || removing?.email,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!removing) return;
                removeMember.mutate(removing.memberId, {
                  onSuccess: () => toast.success(t('members.removed')),
                  onError: (err) => toast.error(err),
                });
                setRemoving(null);
              }}
            >
              {t('members.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

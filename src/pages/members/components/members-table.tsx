import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MemberStatus,
  type Member,
  type MemberStatus as MemberStatusType,
} from '@/types/api';

/** Map a member status to a Badge variant for consistent status coloring. */
const STATUS_VARIANT: Record<
  MemberStatusType,
  'default' | 'secondary' | 'destructive'
> = {
  [MemberStatus.ACTIVE]: 'default',
  [MemberStatus.INVITED]: 'secondary',
  [MemberStatus.SUSPENDED]: 'destructive',
};

interface Props {
  members: Member[];
  isLoading: boolean;
}

/** Page-private table for the Members page (only this page uses it). */
export function MembersTable({ members, isLoading }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{members.length}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">
                    {m.userId}
                  </TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

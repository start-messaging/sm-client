import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Users } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useContacts, useDeleteContact } from '@/api/hooks/use-contacts';
import { type WaContact } from '@/api/contacts.api';
import { toast } from '@/lib/toast';
import { AddContactDialog } from './components/add-contact-dialog';
import { ImportContactsDialog } from './components/import-contacts-dialog';

export function ContactsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data, isLoading } = useContacts(ws.slug);
  const deleteContact = useDeleteContact(ws.slug);

  const [pendingDelete, setPendingDelete] = useState<WaContact | null>(null);

  const contacts = data?.contacts ?? [];

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteContact.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(t('contacts.delete.success'));
        setPendingDelete(null);
      },
      onError: (err) => {
        toast.error(err);
        setPendingDelete(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('contacts.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('contacts.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportContactsDialog slug={ws.slug} />
          <AddContactDialog slug={ws.slug} />
        </div>
      </div>

      {/* Education slot */}
      <EducationSlot
        title={t('contacts.intro.title')}
        body={t('contacts.intro.body')}
      />

      {/* Loading */}
      {isLoading && (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      )}

      {/* Empty state */}
      {!isLoading && contacts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="text-muted-foreground size-10" />
            <div>
              <p className="font-medium">{t('contacts.empty.title')}</p>
              <p className="text-muted-foreground text-sm">
                {t('contacts.empty.body')}
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <ImportContactsDialog slug={ws.slug} />
              <AddContactDialog slug={ws.slug} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact table */}
      {!isLoading && contacts.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('contacts.table.name')}</TableHead>
                <TableHead>{t('contacts.table.phone')}</TableHead>
                <TableHead>{t('contacts.table.tags')}</TableHead>
                <TableHead>{t('contacts.table.optIn')}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {c.phoneE164}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.length === 0 ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        c.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.optedIn ? 'default' : 'outline'}>
                      {c.optedIn ? 'Opted in' : 'Opted out'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8"
                      aria-label={t('contacts.delete.cta')}
                      onClick={() => setPendingDelete(c)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('contacts.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contacts.delete.body', {
                name: pendingDelete?.name ?? pendingDelete?.phoneE164 ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('contacts.delete.cta')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

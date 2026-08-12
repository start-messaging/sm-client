import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
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
import { useContacts } from '@/api/hooks/use-contacts';

export function ContactsPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data, isLoading } = useContacts(ws.slug);

  const contacts = data?.contacts ?? [];

  return (
    <div className="flex flex-col gap-6">
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
          <Button variant="outline" size="sm" disabled>
            {t('contacts.importCta')}
          </Button>
          <Button size="sm" disabled>
            {t('contacts.addCta')}
          </Button>
        </div>
      </div>

      <EducationSlot
        title={t('contacts.intro.title')}
        body={t('contacts.intro.body')}
      />

      {isLoading && (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      )}

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
          </CardContent>
        </Card>
      )}

      {!isLoading && contacts.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Opt-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.name ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {c.phoneE164}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.optedIn ? 'default' : 'outline'}>
                      {c.optedIn ? 'Opted in' : 'Opted out'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

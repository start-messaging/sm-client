import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useImportContactsMapped } from '@/api/hooks/use-contacts';
import { parseCsv, readFileAsText } from '@/lib/csv';
import { toast } from '@/lib/toast';

/** CSV column spec template as a data: URI so no network request is needed. */
const CSV_TEMPLATE =
  'data:text/csv;charset=utf-8,phone,name\n+919876543210,Rahul Sharma\n+15550001234,Jane Doe\n';

type MappingTarget = 'skip' | 'phone' | 'name' | 'email' | 'tag' | 'attr';

/** Best-effort default so common headers (phone, full_name, email_address…) don't need manual mapping. */
function guessTarget(header: string): MappingTarget {
  const h = header.toLowerCase().replace(/[^a-z]/g, '');
  if (['phone', 'mobile', 'number', 'phonenumber', 'mobilenumber'].includes(h))
    return 'phone';
  if (['name', 'fullname', 'contactname'].includes(h)) return 'name';
  if (['email', 'emailaddress'].includes(h)) return 'email';
  if (['tag', 'tags'].includes(h)) return 'tag';
  return 'skip';
}

export function ImportContactsDialog({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'map'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [targets, setTargets] = useState<Record<string, MappingTarget>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportContactsMapped(slug);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setFileError(null);
  };

  const handleNext = async () => {
    if (!file) {
      setFileError(t('contacts.import.noFile'));
      return;
    }
    let parsed: { headers: string[]; rows: Record<string, string>[] };
    try {
      parsed = parseCsv(await readFileAsText(file));
    } catch {
      setFileError(t('contacts.import.errorParsing'));
      return;
    }
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setFileError(t('contacts.import.errorParsing'));
      return;
    }
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    setTargets(
      Object.fromEntries(parsed.headers.map((h) => [h, guessTarget(h)])),
    );
    setStep('map');
  };

  const hasPhoneMapping = Object.values(targets).includes('phone');

  const handleImport = () => {
    if (!hasPhoneMapping) return;
    const mapping: Record<string, string> = {};
    for (const header of csvHeaders) {
      const target = targets[header];
      if (!target || target === 'skip') continue;
      mapping[header] = target === 'attr' ? `attr:${header}` : target;
    }

    importMutation.mutate(
      { rows: csvRows, mapping },
      {
        onSuccess: (result) => {
          toast.success(
            t('contacts.import.success', {
              count: result.imported,
              skipped: result.skipped,
            }),
          );
          handleClose();
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const handleClose = () => {
    setOpen(false);
    setStep('upload');
    setFile(null);
    setFileError(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setTargets({});
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1.5 size-4" />
          {t('contacts.importCta')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('contacts.import.title')}</DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? t('contacts.import.subtitle')
              : t('contacts.import.mapping.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="flex flex-col gap-4">
            {/* Format hint */}
            <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs leading-relaxed">
              {t('contacts.import.hint')}
            </p>

            {/* Template download */}
            <a
              href={CSV_TEMPLATE}
              download="contacts-template.csv"
              className="text-primary text-xs underline underline-offset-2"
            >
              Download sample CSV
            </a>

            {/* File picker */}
            <div
              className="border-border hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed py-8 text-center transition-colors"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <Upload className="text-muted-foreground size-8" />
              {file ? (
                <span className="text-sm font-medium">{file.name}</span>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {t('contacts.import.dropzone')}
                </span>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {fileError && (
              <p className="text-destructive text-xs">{fileError}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">
              {t('contacts.import.mapping.hint')}
            </p>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('contacts.import.mapping.column')}</TableHead>
                    <TableHead>{t('contacts.import.mapping.target')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvHeaders.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-mono text-xs">
                        {header}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={targets[header] ?? 'skip'}
                            onValueChange={(v) =>
                              setTargets((prev) => ({
                                ...prev,
                                [header]: v as MappingTarget,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 w-44 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="phone">
                                {t('contacts.import.mapping.optionPhone')}
                              </SelectItem>
                              <SelectItem value="name">
                                {t('contacts.import.mapping.optionName')}
                              </SelectItem>
                              <SelectItem value="email">
                                {t('contacts.import.mapping.optionEmail')}
                              </SelectItem>
                              <SelectItem value="tag">
                                {t('contacts.import.mapping.optionTag')}
                              </SelectItem>
                              <SelectItem value="attr">
                                {t('contacts.import.mapping.optionAttribute')}
                              </SelectItem>
                              <SelectItem value="skip">
                                {t('contacts.import.mapping.optionSkip')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {targets[header] === 'phone' && (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              {t('contacts.import.mapping.required')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!hasPhoneMapping && (
              <p className="text-destructive text-xs">
                {t('contacts.import.mapping.phoneRequiredError')}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => void handleNext()}
                disabled={!file}
              >
                {t('contacts.import.mapping.next')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('upload')}
              >
                {t('contacts.import.mapping.back')}
              </Button>
              <Button
                type="button"
                disabled={importMutation.isPending || !hasPhoneMapping}
                onClick={handleImport}
              >
                {importMutation.isPending && <Spinner />}
                {t('contacts.import.submit')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

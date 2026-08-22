import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';
import { useImportContacts } from '@/api/hooks/use-contacts';
import { toast } from '@/lib/toast';

/** CSV column spec template as a data: URI so no network request is needed. */
const CSV_TEMPLATE =
  'data:text/csv;charset=utf-8,phone,name\n+919876543210,Rahul Sharma\n+15550001234,Jane Doe\n';

export function ImportContactsDialog({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportContacts(slug);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setFileError(null);
  };

  const handleImport = () => {
    if (!file) {
      setFileError(t('contacts.import.noFile'));
      return;
    }
    const formData = new FormData();
    formData.append('file', file);

    importMutation.mutate(formData, {
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
    });
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setFileError(null);
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

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('contacts.import.title')}</DialogTitle>
          <DialogDescription>{t('contacts.import.subtitle')}</DialogDescription>
        </DialogHeader>

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

          {fileError && <p className="text-destructive text-xs">{fileError}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={importMutation.isPending || !file}
            onClick={handleImport}
          >
            {importMutation.isPending && <Spinner />}
            {t('contacts.import.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

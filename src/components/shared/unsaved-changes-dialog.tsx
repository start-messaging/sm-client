import { useTranslation } from 'react-i18next';
import type { Blocker } from 'react-router-dom';
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

export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  const { t } = useTranslation();
  const open = blocker.state === 'blocked';

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.unsaved.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('common.unsaved.body')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              if (blocker.state === 'blocked') blocker.reset();
            }}
          >
            {t('common.unsaved.stay')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (blocker.state === 'blocked') blocker.proceed();
            }}
          >
            {t('common.unsaved.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { TemplateExamplesGallery } from './components/template-examples-gallery';

export function TemplateSamplesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ws = useCurrentWorkspace();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
          <Link to={`/w/${ws.slug}/templates`}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            {t('templates.editor.back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('templates.examples.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('templates.examples.subtitle')}
        </p>
      </div>

      <TemplateExamplesGallery
        slug={ws.slug}
        onApply={(example) =>
          navigate(
            `/w/${ws.slug}/templates/new?example=${encodeURIComponent(example.id)}`,
          )
        }
      />
    </div>
  );
}

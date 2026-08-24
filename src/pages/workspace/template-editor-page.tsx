import { useMemo } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useTemplates } from '@/api/hooks/use-templates';
import { useResolvedTemplateExamples } from '@/api/hooks/use-template-examples';
import {
  TemplateEditorForm,
  seedFromExample,
  seedFromTemplate,
  type CreateTemplateSeed,
} from './components/template-editor-form';

export function TemplateEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const [params] = useSearchParams();
  const ws = useCurrentWorkspace();
  const examples = useResolvedTemplateExamples(ws.slug);
  const { data, isLoading } = useTemplates(ws.slug);

  const seed: CreateTemplateSeed | null = useMemo(() => {
    const exampleId = params.get('example');
    const fromId = params.get('from');
    const templates = data?.templates ?? [];

    if (editId) {
      const tpl = templates.find((x) => x.id === editId);
      if (!tpl) return null;
      return seedFromTemplate(tpl, { asNewVersion: tpl.status === 'APPROVED' });
    }
    if (fromId) {
      const tpl = templates.find((x) => x.id === fromId);
      if (!tpl) return null;
      return seedFromTemplate(tpl, { asNewVersion: true });
    }
    if (exampleId) {
      const example = examples.find((e) => e.id === exampleId);
      if (example) return seedFromExample(example);
    }
    return null;
  }, [editId, params, data?.templates, examples]);

  const waitingForTemplate = Boolean(editId || params.get('from')) && isLoading;
  const missingEdit = Boolean(editId) && !isLoading && !seed;

  const listPath = `/w/${ws.slug}/templates`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
          <Link to={listPath}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            {t('templates.editor.back')}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {editId
            ? t('templates.editor.editTitle')
            : t('templates.create.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('templates.create.subtitle')}
        </p>
      </div>

      {waitingForTemplate && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner className="size-4" />
          {t('common.loading')}
        </p>
      )}

      {missingEdit && (
        <p className="text-muted-foreground text-sm">
          {t('templates.editor.notFound')}
        </p>
      )}

      {!waitingForTemplate && !missingEdit && (
        <TemplateEditorForm
          key={editId ?? params.get('from') ?? params.get('example') ?? 'new'}
          slug={ws.slug}
          seed={seed}
          onCancel={() => navigate(listPath)}
          onSuccess={() => navigate(listPath)}
        />
      )}
    </div>
  );
}

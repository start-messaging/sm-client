import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TemplateCategory } from '@/api/templates.api';
import {
  TEMPLATE_EXAMPLES,
  examplesByCategory,
  exampleBodyPreview,
  type TemplateExample,
} from '@/lib/template-examples';

const CATEGORY_TABS: { value: TemplateCategory | 'ALL'; labelKey: string }[] = [
  { value: 'ALL', labelKey: 'templates.examples.tabAll' },
  { value: 'UTILITY', labelKey: 'templates.examples.tabUtility' },
  { value: 'MARKETING', labelKey: 'templates.examples.tabMarketing' },
  { value: 'AUTHENTICATION', labelKey: 'templates.examples.tabAuth' },
];

interface TemplateExamplesGalleryProps {
  onApply: (example: TemplateExample) => void;
}

export function TemplateExamplesGallery({
  onApply,
}: TemplateExamplesGalleryProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <Sparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div>
            <CardTitle className="text-base">
              {t('templates.examples.title')}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('templates.examples.subtitle')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ALL">
          <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {t(tab.labelKey)}
                <span className="text-muted-foreground ml-1.5 tabular-nums">
                  {examplesByCategory(tab.value).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORY_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                {examplesByCategory(tab.value).map((example) => (
                  <ExampleCard
                    key={example.id}
                    example={example}
                    onApply={() => onApply(example)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-muted-foreground mt-4 text-xs">
          {t('templates.examples.footer', { count: TEMPLATE_EXAMPLES.length })}
        </p>
      </CardContent>
    </Card>
  );
}

function ExampleCard({
  example,
  onApply,
}: {
  example: TemplateExample;
  onApply: () => void;
}) {
  const { t } = useTranslation();
  const preview = exampleBodyPreview(example);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium truncate">
            {example.suggestedName}
          </p>
          <Badge variant="outline" className="mt-1 text-[10px]">
            {example.category}
          </Badge>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onApply}>
          {t('templates.examples.apply')}
        </Button>
      </div>

      <div className="bg-muted/50 rounded-md px-3 py-2 text-sm leading-relaxed">
        {preview}
      </div>

      <p className="text-muted-foreground text-xs">{example.useWhen}</p>
      <p className="text-xs text-amber-800 dark:text-amber-200/90">
        {example.metaTip}
      </p>
    </div>
  );
}

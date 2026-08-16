import { apiGet } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type { TemplateCategory, TemplateComponent } from '@/api/templates.api';
import type { TemplateExample } from '@/lib/template-examples';

/**
 * Shape of each row from GET /v1/whatsapp/template-examples
 * (server returns a published entity array inside the success envelope).
 */
export interface ApiTemplateExample {
  id: string;
  slug: string;
  suggestedName: string;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
  useWhen: string;
  metaTip: string;
  sortOrder: number;
  status?: string;
}

export function mapApiExample(api: ApiTemplateExample): TemplateExample {
  return {
    id: api.slug || api.id,
    suggestedName: api.suggestedName,
    category: api.category,
    language: api.language,
    components: api.components,
    useWhen: api.useWhen,
    metaTip: api.metaTip,
  };
}

export const templateExamplesApi = {
  list: async (): Promise<TemplateExample[]> => {
    const result = await apiGet<ApiTemplateExample[] | { examples: ApiTemplateExample[] }>(
      endpoints.templateExamples.list(),
    );
    const rows = Array.isArray(result) ? result : (result.examples ?? []);
    return rows.map(mapApiExample);
  },
};

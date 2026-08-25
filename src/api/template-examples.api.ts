import { apiGet } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type { TemplateCategory, TemplateComponent } from '@/api/templates.api';

export interface TemplateExample {
  id: string;
  slug: string;
  suggestedName: string;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
  useWhen: string;
  metaTip: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const templateExamplesApi = {
  list: () => apiGet<TemplateExample[]>(endpoints.templateExamples.list()),
};

export function examplesByCategory(
  examples: TemplateExample[],
  category: TemplateCategory | 'ALL',
): TemplateExample[] {
  if (category === 'ALL') return examples;
  return examples.filter((e) => e.category === category);
}

export function exampleBodyPreview(example: TemplateExample): string {
  return (
    example.components.find((c) => c.type === 'BODY')?.text ??
    example.components
      .map((c) => c.text)
      .filter(Boolean)
      .join(' ')
  );
}

/** 3–4 cards for the templates home: prefer Utility, include one Marketing. */
export function featuredExamples(
  examples: TemplateExample[],
  limit = 4,
): TemplateExample[] {
  const utility = examples.filter((e) => e.category === 'UTILITY');
  const marketing = examples.filter((e) => e.category === 'MARKETING');
  const picked: TemplateExample[] = [];
  for (const e of utility) {
    if (picked.length >= Math.min(3, limit)) break;
    picked.push(e);
  }
  if (picked.length < limit && marketing[0]) picked.push(marketing[0]);
  for (const e of examples) {
    if (picked.length >= limit) break;
    if (!picked.includes(e)) picked.push(e);
  }
  return picked.slice(0, limit);
}

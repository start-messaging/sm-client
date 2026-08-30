import type { TemplateComponent } from '@/api/templates.api';

export function substituteBodyVariables(
  text: string,
  samples: Record<number, string>,
): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => samples[Number(n)] ?? `[Value ${n}]`);
}

export function hydrateTemplate(components: TemplateComponent[]): string {
  const body = components.find((c) => c.type === 'BODY');
  if (!body?.text) return '';
  const samples: Record<number, string> = {};
  const exBody = body.example?.body_text?.[0];
  if (exBody) {
    exBody.forEach((val, i) => {
      samples[i + 1] = val;
    });
  }
  return substituteBodyVariables(body.text, samples);
}

export function bodyVariableIndexes(text: string): number[] {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  return [...new Set(matches.map((m) => Number(m[1])))].sort((a, b) => a - b);
}

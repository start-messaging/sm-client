export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export interface ContentWarning {
  code: string;
  field: 'body' | 'header' | 'general';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export function findTemplateShapeViolation(input: {
  name: string;
  category: TemplateCategory;
  bodyText: string;
  headerText?: string;
}): string | null {
  if (!input.name.trim()) return 'Template name is required.';
  if (!/^[a-z0-9_]+$/.test(input.name))
    return 'Template name may only contain lowercase letters, numbers, and underscores.';
  if (!input.bodyText.trim()) return 'Body text is required.';
  if (input.bodyText.length > 1024) return 'Body text must be 1024 characters or fewer.';

  if (/^\s*\{\{\d+\}\}/.test(input.bodyText))
    return 'Body text cannot start with a variable ({{n}}). Meta will reject this template.';
  if (/\{\{\d+\}\}\s*$/.test(input.bodyText))
    return 'Body text cannot end with a variable ({{n}}). Meta will reject this template.';

  if (input.headerText) {
    if (/^\s*\{\{\d+\}\}/.test(input.headerText))
      return 'Header text cannot start with a variable.';
    if (/\{\{\d+\}\}\s*$/.test(input.headerText))
      return 'Header text cannot end with a variable.';
  }

  if (/\{\{\d+\}\}\s*\{\{\d+\}\}/.test(input.bodyText))
    return 'Body text cannot have two consecutive variables with nothing between them.';

  return null;
}

export function findContentWarnings(
  bodyText: string,
  category: TemplateCategory,
): ContentWarning[] {
  const warnings: ContentWarning[] = [];

  if (
    category === 'MARKETING' &&
    !/\b(stop|opt.?out|unsubscribe|reply stop)\b/i.test(bodyText)
  ) {
    warnings.push({
      code: 'NO_OPT_OUT',
      field: 'body',
      severity: 'warning',
      message:
        'Include an opt-out instruction (e.g. "Reply STOP to unsubscribe"). Meta requires marketing senders to honour opt-out requests.',
    });
  }

  const exclamationCount = (bodyText.match(/!/g) ?? []).length;
  const hasAllCaps = /\b[A-Z]{5,}\b/.test(bodyText);
  if (exclamationCount >= 3 || hasAllCaps) {
    warnings.push({
      code: 'AGGRESSIVE_TONE',
      field: 'body',
      severity: 'info',
      message:
        'Aggressive tone (excessive caps or exclamation marks) increases user block rate. Keep language conversational.',
    });
  }

  return warnings;
}

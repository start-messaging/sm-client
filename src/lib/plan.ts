import type { CurrentWorkspace } from '@/types/api';

/**
 * THE way UI reads plan entitlements. Keys are open-ended (the server adds
 * them as data); these helpers pin the two semantics every key shares:
 * absent feature = OFF, absent/null limit = UNLIMITED. Client checks gate
 * UX only — the server is the enforcement authority.
 *
 *   {hasFeature(ws, 'campaign_analytics') && <InsightsTab />}
 *   const maxMembers = planLimit(ws, 'max_members'); // null = unlimited
 */
export function hasFeature(workspace: CurrentWorkspace, key: string): boolean {
  return workspace.planFeatures[key] === true;
}

/** String-valued feature (e.g. support_level); null when absent. */
export function featureValue(
  workspace: CurrentWorkspace,
  key: string,
): string | null {
  const v = workspace.planFeatures[key];
  return typeof v === 'string' ? v : null;
}

/** Numeric quota; null = unlimited/unset. */
export function planLimit(
  workspace: CurrentWorkspace,
  key: string,
): number | null {
  const v = workspace.planLimits[key];
  return typeof v === 'number' ? v : null;
}

import { ROLE_RANK, WorkspaceRole, type CurrentWorkspace } from '@/types/api';

/**
 * Capability keys with their default minimum roles.
 * Capability keys are always "enabled" — they only gate who can act, not
 * whether the feature exists on the plan. Plan.roleGates overrides these.
 */
export const CAPABILITY_DEFAULTS: Record<string, WorkspaceRole> = {
  manage_members:   WorkspaceRole.ADMIN,
  write_settings:   WorkspaceRole.ADMIN,
  manage_campaigns: WorkspaceRole.MANAGER,
  activate_flows:   WorkspaceRole.MANAGER,
  manage_contacts:  WorkspaceRole.AGENT,
  send_messages:    WorkspaceRole.AGENT,
  view_analytics:   WorkspaceRole.AGENT,
};

/**
 * THE way UI reads plan entitlements. For feature keys: absent = OFF.
 * For capability keys: always passes the feature check; only role gate applies.
 * Plan.roleGates overrides CAPABILITY_DEFAULTS when set.
 *
 *   {hasFeature(ws, 'campaign_analytics') && <InsightsTab />}
 *   {hasCapability(ws, 'manage_members')} — use this for capabilities
 */
export function hasFeature(
  workspace: CurrentWorkspace,
  key: string,
  memberRole?: WorkspaceRole,
): boolean {
  if (workspace.planFeatures[key] !== true) return false;
  const minRole = workspace.planRoleGates?.[key];
  if (!minRole || !memberRole) return true;
  return ROLE_RANK[memberRole] >= ROLE_RANK[minRole as WorkspaceRole];
}

/**
 * Check a capability key (role-based action gate, not plan on/off).
 * Falls back to CAPABILITY_DEFAULTS when plan.roleGates doesn't override.
 */
export function hasCapability(
  workspace: CurrentWorkspace,
  key: string,
  memberRole?: WorkspaceRole,
): boolean {
  const role = memberRole ?? workspace.role;
  const override = workspace.planRoleGates?.[key];
  const minRole = (override ?? CAPABILITY_DEFAULTS[key]) as WorkspaceRole | undefined;
  if (!minRole) return true;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
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

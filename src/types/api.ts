/**
 * Types mirroring the sm-server HTTP contract. ONE place to update when the
 * backend changes.
 *
 * Envelopes (sm-server `response.types.ts`):
 *   success → { data, meta }
 *   error   → { statusCode, error: { code, message, details? }, meta }
 * The axios layer unwraps `data`, so feature code works with the inner payload
 * types below — not the envelope.
 */

export interface EnvelopeMeta {
  requestId: string;
  timestamp: string;
}

export interface SuccessEnvelope<T> {
  data: T;
  meta: EnvelopeMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorEnvelope {
  statusCode: number;
  error: ApiErrorBody;
  meta: EnvelopeMeta & { path: string };
}

/* ----------------------------- enums ----------------------------- */

export const WorkspaceRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  VIEWER: 'VIEWER',
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

/** Privilege ranking — mirrors backend ROLE_RANK. Higher = more privileged. */
export const ROLE_RANK: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  AGENT: 1,
  VIEWER: 0,
};

export const UserStatus = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ServiceKey = {
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  INSTAGRAM: 'instagram',
  RCS: 'rcs',
  EMAIL: 'email',
} as const;
export type ServiceKey = (typeof ServiceKey)[keyof typeof ServiceKey];

export const ServiceStatus = {
  ACTIVE: 'active',
  COMING_SOON: 'coming_soon',
  DEPRECATED: 'deprecated',
} as const;
export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

export const MemberStatus = {
  ACTIVE: 'active',
  INVITED: 'invited',
  SUSPENDED: 'suspended',
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

/* ----------------------------- auth ----------------------------- */

export interface UserView {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  status: UserStatus;
  countryCode: string | null;
}

/** Returned by login / verify-otp. */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserView;
  activeWorkspaceId: string | null;
  activeWorkspaceRole: WorkspaceRole | null;
}

/** Returned by signup (identity only). `devOtp` only present outside production. */
export interface SignupResult {
  verificationToken: string;
  devOtp?: string;
}

/** Returned by refresh — rotating refresh token, so BOTH come back. */
export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

/** A workspace membership as returned inside /auth/me (drives the switcher). */
export interface MeWorkspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  status: MemberStatus;
}

/** Returned by GET /auth/me. */
export interface MeResult {
  user: UserView;
  activeWorkspaceId: string | null;
  activeWorkspaceRole: WorkspaceRole | null;
  workspaces: MeWorkspace[];
}

/** Returned by POST /auth/switch-workspace — only a fresh access token. */
export interface SwitchWorkspaceResult {
  accessToken: string;
}

/* --------------------------- workspaces --------------------------- */

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  defaultCurrency: string;
  role: WorkspaceRole;
  status: string;
  isActive: boolean;
}

export interface CurrentWorkspace {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  defaultCurrency: string;
  timezone: string | null;
  status: string;
  role: WorkspaceRole | null;
}

export interface CreatedWorkspace {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  defaultCurrency: string;
  service: { key: ServiceKey; status: string };
}

/* ----------------------------- members ----------------------------- */

export interface Member {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: MemberStatus;
  invitedBy: string | null;
  joinedAt: string | null;
}

/* ----------------------------- services ----------------------------- */

export interface Service {
  id: string;
  key: ServiceKey;
  displayName: string;
  description: string | null;
  status: ServiceStatus;
}

/* --------------------------- request bodies --------------------------- */

export interface SignupBody {
  email: string;
  password: string;
  fullName?: string;
  mobileE164?: string;
  countryCode?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface VerifyOtpBody {
  verificationToken: string;
  code: string;
}

export interface CreateWorkspaceBody {
  name: string;
  countryCode: string;
  serviceKey: ServiceKey;
}

export interface InviteMemberBody {
  email: string;
  role: WorkspaceRole;
}

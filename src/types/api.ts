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

export const ServiceStatus = {
  ACTIVE: 'active',
  BETA: 'beta',
  COMING_SOON: 'coming_soon',
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
  mobileE164: string | null;
  /** False until the SMS OTP step completes — gates the app (RequireOnboarded). */
  mobileVerified: boolean;
  status: UserStatus;
  /** Derived server-side from the verified mobile number. */
  countryCode: string | null;
}

/** Returned by login / verify-otp. */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserView;
}

/**
 * Returned wherever the server sends (or re-uses) an OTP: signup, set-mobile,
 * resend-otp, and inside the USER_NOT_VERIFIED login recovery details.
 * `devCode` only outside production AND only when a code was freshly sent.
 */
export interface OtpIssueResult {
  verificationToken: string;
  /** Seconds until the code expires — drives the wizard-resume storage TTL. */
  expiresInSec: number;
  /** Seconds to wait before offering resend (seeds the countdown). */
  resendCooldownSec: number;
  devCode?: string;
}

/** Returned by signup (identity only). */
export type SignupResult = OtpIssueResult;

/** Returned by POST /auth/resend-otp. */
export type ResendOtpResult = OtpIssueResult;

/** `details` payload of a 403 USER_NOT_VERIFIED login error. */
export interface UserNotVerifiedDetails extends OtpIssueResult {
  email: string;
}

export function isUserNotVerifiedDetails(
  d: unknown,
): d is UserNotVerifiedDetails {
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof (d as UserNotVerifiedDetails).email === 'string' &&
    typeof (d as UserNotVerifiedDetails).verificationToken === 'string'
  );
}

/** `details` payload of a 429 OTP_COOLDOWN error. */
export interface OtpCooldownDetails {
  retryAfterSec: number;
}

export function isOtpCooldownDetails(d: unknown): d is OtpCooldownDetails {
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof (d as OtpCooldownDetails).retryAfterSec === 'number'
  );
}

/** Returned by refresh — rotating refresh token, so BOTH come back. */
export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

/** Returned by GET /auth/me — the user profile itself. */
export type MeResult = UserView;

/** Returned by POST /auth/mobile (step 3) — same contract as signup. */
export type SetMobileResult = SignupResult;

/* --------------------------- workspaces --------------------------- */

/** One row of GET /v1/workspaces — feeds the launcher, gallery and switcher. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  /** The service this workspace was created under (one per workspace). */
  serviceKey: string;
  countryCode: string;
  defaultCurrency: string;
  planCode: string;
  role: WorkspaceRole;
  status: string;
}

/**
 * Plan entitlements are OPEN key-value sets: the server can add keys at any
 * time (seed/admin edit, no deploy) and the client gates UI off whatever
 * arrives. Absent feature = off; absent/null limit = unlimited. Read them
 * through lib/plan.ts, never inline — and remember client checks are UX only;
 * the server enforces.
 */
export type PlanFeatures = Record<string, boolean | string>;
export type PlanLimits = Record<string, number | null>;

/** GET /v1/workspaces/:slug — the workspace shell's context. */
export interface CurrentWorkspace extends WorkspaceSummary {
  timezone: string | null;
  planFeatures: PlanFeatures;
  planLimits: PlanLimits;
}

export interface CreateWorkspaceBody {
  name: string;
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

export interface PublicServiceCategory {
  key: string;
  label: string;
  hint: string | null;
}

/** A service available in the user's country (GET /v1/services). */
export interface PublicService {
  key: string;
  name: string;
  short: string;
  description: string | null;
  status: ServiceStatus;
  categories: PublicServiceCategory[];
}

/* ----------------------------- countries ----------------------------- */

/** Lean country row for the onboarding phone picker (GET /v1/countries). */
export interface PublicCountry {
  code: string;
  name: string;
  dialCode: string;
}

/* --------------------------- request bodies --------------------------- */

export interface SignupBody {
  email: string;
  password: string;
  /** Required by the server DTO (MinLength 1). */
  fullName: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface VerifyOtpBody {
  verificationToken: string;
  code: string;
}

export interface SetMobileBody {
  mobileE164: string;
}

export interface ResendOtpBody {
  verificationToken: string;
}

export interface InviteMemberBody {
  email: string;
  role: WorkspaceRole;
}

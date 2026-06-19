/**
 * Single source of truth for every backend route this app calls. Change a path
 * (or the API version) here once — never hunt through the `*.api.ts` files.
 *
 * Static paths are plain strings; parameterized ones are functions. Everything
 * is prefixed with the API version via `v1()`, so bumping `/v1` → `/v2` is a
 * one-line edit.
 */
const API_VERSION = 'v1';
const v1 = (path: string) => `/${API_VERSION}${path}`;

export const endpoints = {
  auth: {
    signup: v1('/auth/signup'),
    verifyOtp: v1('/auth/verify-otp'),
    resendOtp: v1('/auth/resend-otp'),
    setMobile: v1('/auth/mobile'),
    verifyMobileOtp: v1('/auth/verify-mobile-otp'),
    login: v1('/auth/login'),
    refresh: v1('/auth/refresh'),
    me: v1('/auth/me'),
    logout: v1('/auth/logout'),
  },
  services: {
    // Services available in the authenticated user's country.
    list: v1('/services'),
    // Service-first creation: a workspace is born under a service.
    createWorkspace: (serviceKey: string) =>
      v1(`/services/${serviceKey}/workspaces`),
  },
  workspaces: {
    // Every workspace the caller belongs to.
    mine: v1('/workspaces'),
    bySlug: (slug: string) => v1(`/workspaces/${slug}`),
    walletBySlug: (slug: string) => v1(`/workspaces/${slug}/wallet`),
  },
  members: {
    list: (slug: string) => v1(`/workspaces/${slug}/members`),
    invitations: (slug: string) =>
      v1(`/workspaces/${slug}/members/invitations`),
    invitation: (slug: string, invId: string) =>
      v1(`/workspaces/${slug}/members/invitations/${invId}`),
    resend: (slug: string, invId: string) =>
      v1(`/workspaces/${slug}/members/invitations/${invId}/resend`),
    role: (slug: string, memberId: string) =>
      v1(`/workspaces/${slug}/members/${memberId}/role`),
    member: (slug: string, memberId: string) =>
      v1(`/workspaces/${slug}/members/${memberId}`),
  },
  // Token-based invite acceptance (outside any workspace context).
  invitations: {
    preview: (token: string) => v1(`/invitations/${token}`),
    accept: (token: string) => v1(`/invitations/${token}/accept`),
    claim: (token: string) => v1(`/invitations/${token}/claim`),
  },
  countries: {
    // Active countries for the onboarding phone picker.
    list: v1('/countries'),
  },
} as const;

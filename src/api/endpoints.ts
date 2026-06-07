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
    login: v1('/auth/login'),
    refresh: v1('/auth/refresh'),
    me: v1('/auth/me'),
    switchWorkspace: v1('/auth/switch-workspace'),
    logout: v1('/auth/logout'),
    logoutAll: v1('/auth/logout-all'),
  },
  workspaces: {
    list: v1('/workspaces'),
    current: v1('/workspaces/current'),
    create: v1('/workspaces'),
  },
  members: {
    list: v1('/members'),
    invite: v1('/members/invite'),
    role: (memberId: string) => v1(`/members/${memberId}/role`),
    byId: (memberId: string) => v1(`/members/${memberId}`),
  },
  services: {
    list: v1('/services'),
  },
} as const;

import { apiDelete, apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';

const TOKEN_STORAGE_KEY = 'sm.fcmWebToken';

export const fcmPushApi = {
  status: () => apiGet<{ enabled: boolean }>(endpoints.push.fcmWebStatus),

  register: (token: string) =>
    apiPost<{ id: string }>(endpoints.push.fcmWeb, { token }),

  unregister: (token: string) =>
    apiDelete<void>(endpoints.push.fcmWeb, { data: { token } }),
};

export function loadStoredFcmToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeFcmToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

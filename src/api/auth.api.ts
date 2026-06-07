import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type {
  AuthResult,
  LoginBody,
  MeResult,
  SignupBody,
  SignupResult,
  SwitchWorkspaceResult,
  VerifyOtpBody,
} from '@/types/api';

/** Raw auth endpoint calls. All under /v1/auth. Hooks wrap these (see hooks/). */
export const authApi = {
  signup: (body: SignupBody) =>
    apiPost<SignupResult>(endpoints.auth.signup, body),

  verifyOtp: (body: VerifyOtpBody) =>
    apiPost<AuthResult>(endpoints.auth.verifyOtp, body),

  login: (body: LoginBody) => apiPost<AuthResult>(endpoints.auth.login, body),

  me: () => apiGet<MeResult>(endpoints.auth.me),

  switchWorkspace: (workspaceId: string) =>
    apiPost<SwitchWorkspaceResult>(endpoints.auth.switchWorkspace, {
      workspaceId,
    }),

  logout: () => apiPost<void>(endpoints.auth.logout),

  logoutAll: () => apiPost<void>(endpoints.auth.logoutAll),
};

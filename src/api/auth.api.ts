import { apiGet, apiPost } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type {
  AuthResult,
  LoginBody,
  MeResult,
  ResendOtpBody,
  ResendOtpResult,
  SetMobileBody,
  SetMobileResult,
  SignupBody,
  SignupResult,
  UserView,
  VerifyOtpBody,
} from '@/types/api';

/** Raw auth endpoint calls. All under /v1/auth. Hooks wrap these (see hooks/). */
export const authApi = {
  signup: (body: SignupBody) =>
    apiPost<SignupResult>(endpoints.auth.signup, body),

  verifyOtp: (body: VerifyOtpBody) =>
    apiPost<AuthResult>(endpoints.auth.verifyOtp, body),

  resendOtp: (body: ResendOtpBody) =>
    apiPost<ResendOtpResult>(endpoints.auth.resendOtp, body),

  setMobile: (body: SetMobileBody) =>
    apiPost<SetMobileResult>(endpoints.auth.setMobile, body),

  verifyMobileOtp: (body: VerifyOtpBody) =>
    apiPost<UserView>(endpoints.auth.verifyMobileOtp, body),

  login: (body: LoginBody) => apiPost<AuthResult>(endpoints.auth.login, body),

  me: () => apiGet<MeResult>(endpoints.auth.me),

  logout: () => apiPost<void>(endpoints.auth.logout),
};

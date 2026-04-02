import { discoverEndpoints } from './discovery';
import { http } from './http';
import { setStoredToken, clearStoredToken } from './tokenStore';
import {
  LoginResponse,
  MfaMethod,
  FluxerUser,
  isLoginSuccess,
  isMfaRequired,
} from '../types/fluxer';

async function apiBase(instanceUrl?: string): Promise<string> {
  console.log('[auth] apiBase called with instanceUrl:', instanceUrl);
  const endpoints = await discoverEndpoints(instanceUrl);
  console.log('[auth] discoverEndpoints returned:', endpoints);
  return endpoints.api;
}

export async function login(
  email: string,
  password: string,
  instanceUrl?: string,
  inviteCode?: string,
  hCaptchaToken?: string,
): Promise<LoginResponse> {
  console.log('[auth] login called, instanceUrl:', instanceUrl, 'has captcha:', !!hCaptchaToken);
  const api = await apiBase(instanceUrl);
  const loginUrl = `${api}/auth/login`;
  console.log('[auth] login URL:', loginUrl);
  const body = {
    email,
    password,
    ...(inviteCode ? { inviteCode } : {}),
    ...(hCaptchaToken ? { 'h-captcha-response': hCaptchaToken } : {}),
  };
  console.log('[auth] login body:', { ...body, password: '***', 'h-captcha-response': body['h-captcha-response'] ? '***' : undefined });
  const response = await http.post<LoginResponse>(loginUrl, body);

  if (isLoginSuccess(response)) {
    await setStoredToken(response.token, response.user_id);
  }
  // If isMfaRequired: caller stores ticket in React state — NOT Preferences
  // If pending_verification: caller must surface "check your email" message
  return response;
}

export async function loginWithMfa(
  ticket: string,
  code: string,
  method: MfaMethod,
  instanceUrl?: string,
): Promise<void> {
  const api = await apiBase(instanceUrl);
  const endpoints: Record<MfaMethod, string> = {
    totp:    `${api}/auth/login/mfa/totp`,
    sms:     `${api}/auth/login/mfa/sms`,
    webauthn:`${api}/auth/login/mfa/webauthn`,
  };
  const response = await http.post<{ token: string; user_id: string }>(
    endpoints[method],
    { ticket, code },
  );
  await setStoredToken(response.token, response.user_id);
}

export async function validateSession(instanceUrl?: string): Promise<FluxerUser> {
  const api = await apiBase(instanceUrl);
  return http.get<FluxerUser>(`${api}/users/@me`);
}

export async function logout(instanceUrl?: string): Promise<void> {
  try {
    const api = await apiBase(instanceUrl);
    await http.post(`${api}/auth/logout`);
  } finally {
    // Always clear local token even if the server call fails
    await clearStoredToken();
  }
}

export { isLoginSuccess, isMfaRequired };

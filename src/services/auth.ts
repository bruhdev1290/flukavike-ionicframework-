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
  const endpoints = await discoverEndpoints(instanceUrl);
  return endpoints.api;
}

export async function login(
  email: string,
  password: string,
  instanceUrl?: string,
  inviteCode?: string,
): Promise<LoginResponse> {
  const api = await apiBase(instanceUrl);
  const body = { email, password, ...(inviteCode ? { inviteCode } : {}) };
  const response = await http.post<LoginResponse>(`${api}/auth/login`, body);

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

import { useCallback, useEffect } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { useAuthContext } from '../contexts/AuthContext';
import {
  login as authLogin,
  loginWithMfa as authLoginWithMfa,
  validateSession,
  logout as authLogout,
  isLoginSuccess,
  isMfaRequired,
} from '../services/auth';
import { discoverEndpoints } from '../services/discovery';
import { MfaMethod } from '../types/fluxer';

export function useAuth() {
  const { authState, dispatch } = useAuthContext();

  // ── App boot: check for a valid stored token ──────────────────────────────
  useEffect(() => {
    async function initAuth() {
      dispatch({ type: 'AUTHENTICATING' });
      try {
        // Discover endpoints first, as it's needed for all API calls
        const discovery = await discoverEndpoints();
        dispatch({ type: 'SET_DISCOVERY', payload: discovery });

        const user = await validateSession();
        dispatch({ type: 'AUTHENTICATED', user });
      } catch {
        // No token or expired — transition to unauthenticated (not an error)
        dispatch({ type: 'LOGOUT' });
      } finally {
        // Hide splash AFTER auth check regardless of outcome.
        // 300ms fade matches Ivory's polished launch dissolve.
        await SplashScreen.hide({ fadeOutDuration: 300 });
      }
    }
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (
    email: string,
    password: string,
    instanceUrl?: string,
    inviteCode?: string,
    hCaptchaToken?: string,
  ) => {
    dispatch({ type: 'AUTHENTICATING' });
    try {
      const response = await authLogin(email, password, instanceUrl, inviteCode, hCaptchaToken);

      if (isLoginSuccess(response)) {
        if (response.pending_verification) {
          // Unrecognized IP + no MFA: server sent an authorization email
          dispatch({ type: 'IP_AUTH_REQUIRED' });
          return;
        }
        // Fetch full profile — /auth/login only returns token + user_id
        const user = await validateSession();
        dispatch({ type: 'AUTHENTICATED', user });
      } else if (isMfaRequired(response)) {
        const methods: MfaMethod[] = [];
        if (response.totp)    methods.push('totp');
        if (response.sms)     methods.push('sms');
        if (response.webauthn) methods.push('webauthn');
        dispatch({ type: 'MFA_REQUIRED', ticket: response.ticket, allowedMethods: methods });
      }
    } catch (e) {
      dispatch({ type: 'ERROR', message: (e as Error).message });
    }
  }, [dispatch]);

  // ── MFA ───────────────────────────────────────────────────────────────────
  const submitMfa = useCallback(async (code: string, method: MfaMethod) => {
    if (!authState.mfaTicket) return;
    dispatch({ type: 'AUTHENTICATING' });
    try {
      await authLoginWithMfa(authState.mfaTicket, code, method);
      const user = await validateSession();
      dispatch({ type: 'AUTHENTICATED', user });
    } catch (e) {
      dispatch({ type: 'ERROR', message: (e as Error).message });
    }
  }, [authState.mfaTicket, dispatch]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authLogout(); } finally { dispatch({ type: 'LOGOUT' }); }
  }, [dispatch]);

  return {
    user:              authState.user,
    authState:         authState.state,
    mfaAllowedMethods: authState.mfaAllowedMethods,
    error:             authState.error,
    discovery:         authState.discovery,
    login,
    submitMfa,
    logout,
  };
}

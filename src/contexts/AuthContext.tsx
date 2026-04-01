import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
} from 'react';
import { AuthStateName, FluxerUser, MfaMethod } from '../types/fluxer';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthStateShape {
  state: AuthStateName;
  user: FluxerUser | null;
  mfaTicket: string | null;
  mfaAllowedMethods: MfaMethod[];
  error: string | null;
}

export const initialAuthState: AuthStateShape = {
  state: 'initializing',
  user: null,
  mfaTicket: null,
  mfaAllowedMethods: [],
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────
export type AuthAction =
  | { type: 'AUTHENTICATING' }
  | { type: 'AUTHENTICATED'; user: FluxerUser }
  | { type: 'MFA_REQUIRED'; ticket: string; allowedMethods: MfaMethod[] }
  | { type: 'IP_AUTH_REQUIRED' }
  | { type: 'LOGOUT' }
  | { type: 'ERROR'; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Reducer — pure state transitions
// ─────────────────────────────────────────────────────────────────────────────
export function authReducer(state: AuthStateShape, action: AuthAction): AuthStateShape {
  switch (action.type) {
    case 'AUTHENTICATING':
      return { ...state, state: 'authenticating', error: null };

    case 'AUTHENTICATED':
      return {
        state: 'authenticated',
        user: action.user,
        mfaTicket: null,
        mfaAllowedMethods: [],
        error: null,
      };

    case 'MFA_REQUIRED':
      return {
        ...state,
        state: 'mfa_required',
        mfaTicket: action.ticket,
        mfaAllowedMethods: action.allowedMethods,
        error: null,
      };

    case 'IP_AUTH_REQUIRED':
      return { ...state, state: 'ip_auth_required', error: null };

    case 'LOGOUT':
      return { ...initialAuthState, state: 'unauthenticated' };

    case 'ERROR':
      return { ...state, state: 'error', error: action.message };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  authState: AuthStateShape;
  dispatch: React.Dispatch<AuthAction>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, dispatch] = useReducer(authReducer, initialAuthState);
  return (
    <AuthContext.Provider value={{ authState, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}

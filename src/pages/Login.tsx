import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonButton, IonToast, IonLoading,
  IonIcon, IonSpinner,
} from '@ionic/react';
import { chevronDownOutline, chevronUpOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAuth } from '../hooks/useAuth';
import { MfaMethod } from '../types/fluxer';
import { setAppUrl, getAppUrl } from '../services/settings';
import { clearDiscoveryCache } from '../services/discovery';
import './Login.css';

// Fluxer logo as inline SVG (blurple F)
const FluxerLogo = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-label="Fluxer">
    <rect width="56" height="56" rx="16" fill="#5865F2"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle"
          fontFamily="-apple-system, sans-serif" fontWeight="800" fontSize="28" fill="white">
      F
    </text>
  </svg>
);

export const Login: React.FC = () => {
  const router = useIonRouter();
  const { authState, login, submitMfa, mfaAllowedMethods, error } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [mfaCode, setMfaCode]   = useState('');
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>('totp');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serverUrl, setServerUrl]       = useState('https://fluxer.app');
  const [showToast, setShowToast]       = useState(false);
  const [shake, setShake]               = useState(false);

  const isLoading   = authState === 'authenticating';
  const isMfa       = authState === 'mfa_required';
  const isIpAuth    = authState === 'ip_auth_required';

  // Load saved server URL on mount
  useEffect(() => { getAppUrl().then(setServerUrl); }, []);

  // Redirect when authenticated
  useEffect(() => {
    if (authState === 'authenticated') {
      router.push('/home', 'root', 'replace');
    }
  }, [authState]);

  // Show toast + shake on error
  useEffect(() => {
    if (error) {
      setShowToast(true);
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Set MFA method default when methods load
  useEffect(() => {
    if (mfaAllowedMethods.length > 0) setMfaMethod(mfaAllowedMethods[0]);
  }, [mfaAllowedMethods]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    await login(email.trim(), password.trim());
  };

  const handleMfaSubmit = async () => {
    if (!mfaCode.trim()) return;
    await submitMfa(mfaCode.trim(), mfaMethod);
  };

  const handleServerUrlBlur = async () => {
    await setAppUrl(serverUrl);
    clearDiscoveryCache();
  };

  return (
    <IonPage className="flx-login-page">
      <IonContent className="flx-login-content" fullscreen>
        <div className="flx-login-bg" />

        <div className={`flx-login-card${shake ? ' flx-shake' : ''}`}>
          <div className="flx-login-card__logo">
            <FluxerLogo />
          </div>

          {/* ── IP Auth required ───────────────────────────────────────── */}
          {isIpAuth && (
            <div className="flx-login-card__section flx-fade-in">
              <h2 className="flx-login-card__title">Check your email</h2>
              <p className="flx-login-card__subtitle">
                We sent a link to authorize this new login location.
                Click it in your email, then try signing in again.
              </p>
              <IonButton
                expand="block"
                fill="outline"
                className="flx-login-card__btn"
                onClick={() => window.location.reload()}
              >
                Try again
              </IonButton>
            </div>
          )}

          {/* ── MFA step ──────────────────────────────────────────────── */}
          {isMfa && !isIpAuth && (
            <div className="flx-login-card__section flx-slide-in-right">
              <h2 className="flx-login-card__title">Two-Factor Auth</h2>
              <p className="flx-login-card__subtitle">Enter your verification code to continue.</p>

              {/* Method selector — only shown when multiple methods available */}
              {mfaAllowedMethods.length > 1 && (
                <div className="flx-mfa-methods">
                  {mfaAllowedMethods.map(m => (
                    <button
                      key={m}
                      className={`flx-mfa-method${mfaMethod === m ? ' flx-mfa-method--active' : ''}`}
                      onClick={() => setMfaMethod(m)}
                    >
                      {m === 'totp' ? 'Authenticator' : m === 'sms' ? 'SMS' : 'Passkey'}
                    </button>
                  ))}
                </div>
              )}

              <div className="flx-input-group">
                <input
                  type="number"
                  inputMode="numeric"
                  className="flx-input"
                  placeholder="6-digit code"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  maxLength={6}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleMfaSubmit()}
                />
              </div>

              <IonButton
                expand="block"
                className="flx-login-card__btn"
                onClick={handleMfaSubmit}
                disabled={isLoading || mfaCode.trim().length < 6}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'Verify'}
              </IonButton>
            </div>
          )}

          {/* ── Email / password step ─────────────────────────────────── */}
          {!isMfa && !isIpAuth && (
            <div className="flx-login-card__section">
              <h2 className="flx-login-card__title">Welcome back</h2>
              <p className="flx-login-card__subtitle">Sign in to continue to Fluxer.</p>

              <div className="flx-input-group">
                <label className="flx-label">Email</label>
                <input
                  type="email"
                  className="flx-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <div className="flx-input-group">
                <label className="flx-label">Password</label>
                <div className="flx-input-wrapper">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="flx-input flx-input--has-icon"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    className="flx-input-icon-btn"
                    onClick={() => setShowPw(v => !v)}
                    type="button"
                    tabIndex={-1}
                  >
                    <IonIcon icon={showPw ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
              </div>

              <IonButton
                expand="block"
                className="flx-login-card__btn"
                onClick={handleLogin}
                disabled={isLoading || !email.trim() || !password.trim()}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'Log In'}
              </IonButton>

              {/* Advanced / self-hosted instance */}
              <button
                className="flx-advanced-toggle"
                onClick={() => setShowAdvanced(v => !v)}
              >
                <IonIcon icon={showAdvanced ? chevronUpOutline : chevronDownOutline} />
                <span>Advanced</span>
              </button>

              {showAdvanced && (
                <div className="flx-input-group flx-fade-in">
                  <label className="flx-label">Server URL</label>
                  <input
                    type="url"
                    className="flx-input"
                    placeholder="https://fluxer.app"
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    onBlur={handleServerUrlBlur}
                  />
                  <span className="flx-hint">Leave as default for the public instance.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </IonContent>

      <IonToast
        isOpen={showToast}
        message={error ?? 'Authentication failed'}
        duration={3500}
        color="danger"
        position="top"
        onDidDismiss={() => setShowToast(false)}
      />
    </IonPage>
  );
};

export default Login;

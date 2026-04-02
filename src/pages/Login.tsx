import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  IonPage, IonContent, IonButton, IonToast, IonLoading,
  IonIcon, IonSpinner,
} from '@ionic/react';
import {
  chevronDownOutline, chevronUpOutline, eyeOutline, eyeOffOutline,
  checkmarkCircleOutline, warningOutline,
} from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAuth } from '../hooks/useAuth';
import { MfaMethod } from '../types/fluxer';
import { setAppUrl, getAppUrl } from '../services/settings';
import { clearDiscoveryCache, verifyEndpoint } from '../services/discovery';
import './Login.css';

// hCaptcha component (can be moved to its own file)
const HCaptcha = ({ sitekey, onVerify, host }: { sitekey: string; onVerify: (token: string) => void; host?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);

  // Keep callback ref up to date
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    console.log('[hCaptcha] Initializing with sitekey:', sitekey);

    // Expose verify callback globally for hCaptcha to call
    (window as unknown as Record<string, unknown>).hcaptchaCallback = (token: string) => {
      console.log('[hCaptcha] Token received, length:', token?.length);
      onVerifyRef.current(token);
    };

    const renderWidget = () => {
      const hcaptcha = (window as unknown as { hcaptcha?: { render: (container: string | HTMLElement, options: { sitekey: string; callback: string; tabindex?: number }) => string } }).hcaptcha;
      console.log('[hCaptcha] renderWidget called, hcaptcha available:', !!hcaptcha, 'container:', !!containerRef.current);
      if (hcaptcha && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = hcaptcha.render(containerRef.current, {
            sitekey,
            callback: 'hcaptchaCallback',
            tabindex: -1,
          });
          console.log('[hCaptcha] Widget rendered, ID:', widgetIdRef.current);
        } catch (e) {
          console.error('[hCaptcha] render error:', e);
        }
      }
    };

    // Always register onload so it fires when hCaptcha finishes initializing,
    // regardless of whether the script tag already exists in the DOM
    (window as unknown as Record<string, unknown>).hcaptchaOnload = renderWidget;

    if (document.querySelector('script[src*="hcaptcha.com"]')) {
      // Script tag exists — if the API is already initialized, render now.
      // If not (e.g. parallel React render added the tag but it hasn't loaded yet),
      // hcaptchaOnload above will be called by hCaptcha once it's ready.
      console.log('[hCaptcha] Script already loaded');
      if ((window as unknown as { hcaptcha?: unknown }).hcaptcha) {
        renderWidget();
      }
    } else {
      const params = new URLSearchParams({ render: 'explicit', onload: 'hcaptchaOnload' });
      if (host) params.set('host', host);

      const script = document.createElement('script');
      script.src = `https://js.hcaptcha.com/1/api.js?${params}`;
      script.async = true;
      script.defer = true;
      script.onload = () => console.log('[hCaptcha] Script loaded');
      script.onerror = () => console.error('[hCaptcha] Failed to load script');
      document.body.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current) {
        const hcaptcha = (window as unknown as { hcaptcha?: { reset: (id: string) => void } }).hcaptcha;
        hcaptcha?.reset(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [sitekey, host]);

  return <div ref={containerRef} style={{ minHeight: 78 }} tabIndex={-1} />;
};


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
  const {
    authState,
    login,
    submitMfa,
    mfaAllowedMethods,
    error,
    discovery,
  } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [mfaCode, setMfaCode]   = useState('');
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>('totp');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serverUrl, setServerUrl]       = useState('https://fluxer.app');
  const [showToast, setShowToast]       = useState(false);
  const [shake, setShake]               = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [hCaptchaToken, setHCaptchaToken] = useState<string | null>(null);
  const [forceShowCaptcha, setForceShowCaptcha] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Memoize captcha verification callback to prevent re-renders
  const handleCaptchaVerify = useCallback((token: string) => {
    console.log('[Login] hCaptcha verified, token length:', token?.length);
    setHCaptchaToken(token);
  }, []);

  // Memoize whether to show captcha
  const showCaptcha = useMemo(() => {
    return forceShowCaptcha || discovery?.captcha?.provider === 'hcaptcha' || serverUrl.includes('fluxer.app');
  }, [forceShowCaptcha, discovery?.captcha?.provider, serverUrl]);

  // Derive hostname for hCaptcha — fixes "localhost detected" warning in native WebViews
  const hCaptchaHost = useMemo(() => {
    try { return new URL(serverUrl).hostname; } catch { return undefined; }
  }, [serverUrl]);

  const isLoading   = authState === 'authenticating';
  const isMfa       = authState === 'mfa_required';
  const isIpAuth    = authState === 'ip_auth_required';

  // Load saved server URL on mount
  useEffect(() => { getAppUrl().then(setServerUrl); }, []);

  // Debug logging
  useEffect(() => {
    console.log('[Login] discovery:', discovery);
    console.log('[Login] forceShowCaptcha:', forceShowCaptcha);
    console.log('[Login] hCaptchaToken:', !!hCaptchaToken);
  }, [discovery, forceShowCaptcha, hCaptchaToken]);

  // Redirect when authenticated
  useEffect(() => {
    if (authState === 'authenticated') {
      router.push('/home', 'root', 'replace');
    }
  }, [authState]);

  // Show toast + shake on error
  useEffect(() => {
    console.log('[Login] error effect triggered, error:', error);
    if (error) {
      setLoginError(error);
      setShowToast(true);
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      // If captcha is required, force show the captcha widget
      if (error.toLowerCase().includes('captcha')) {
        console.log('[Login] Captcha error detected, forcing captcha display');
        setForceShowCaptcha(true);
      }
      // Reset captcha token after error so user must solve it again
      setHCaptchaToken(null);
      try {
        const hcaptcha = (window as unknown as { hcaptcha?: { reset: () => void } }).hcaptcha;
        hcaptcha?.reset();
      } catch (e) {
        // ignore reset errors
      }
      return () => clearTimeout(t);
    }
  }, [error, authState]);

  // Set MFA method default when methods load
  useEffect(() => {
    if (mfaAllowedMethods.length > 0) setMfaMethod(mfaAllowedMethods[0]);
  }, [mfaAllowedMethods]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    
    // Check if captcha is required but not completed
    if (showCaptcha && !hCaptchaToken) {
      setLoginError('Please complete the security check (captcha) before logging in');
      return;
    }
    
    console.log('[Login] Attempting login, captcha token present:', !!hCaptchaToken);
    setLoginError(null);
    try {
      await login(email.trim(), password.trim(), undefined, undefined, hCaptchaToken ?? undefined);
    } catch (e) {
      console.error('[Login] Login failed:', e);
      const msg = (e as Error).message;
      if (msg.includes('CORS') || msg.includes('access control') || msg.includes('not allowed')) {
        setLoginError('CORS Error: If running in simulator, open Safari DevTools console and run: window.forceNative = true; then retry');
      } else {
        setLoginError(msg);
      }
    }
  };

  const handleMfaSubmit = async () => {
    if (!mfaCode.trim()) return;
    await submitMfa(mfaCode.trim(), mfaMethod);
  };

  const handleServerUrlBlur = async () => {
    setVerificationStatus('verifying');
    setVerificationError(null);
    const result = await verifyEndpoint(serverUrl);

    if (result.ok) {
      setVerificationStatus('valid');
      await setAppUrl(serverUrl);
      clearDiscoveryCache();
    } else {
      setVerificationStatus('invalid');
      setVerificationError(result.error);
    }
  };

  return (
    <IonPage className="flx-login-page">
      <IonContent className="flx-login-content" fullscreen>
        <div className="flx-login-bg" />

        <div className="flx-login-center">
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
              
              {/* Debug info - remove in production */}
              {loginError && (
                <div style={{ background: '#ff4444', color: 'white', padding: 8, borderRadius: 4, marginBottom: 16, fontSize: 12 }}>
                  Error: {loginError}
                </div>
              )}

              <div className="flx-input-group">
                <label className="flx-label">Email</label>
                <input
                  type="email"
                  className="flx-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
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
                disabled={isLoading || !email.trim() || !password.trim() || ((forceShowCaptcha || discovery?.captcha?.provider === 'hcaptcha') && !hCaptchaToken)}
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
                  <div className="flx-input-wrapper">
                    <input
                      type="url"
                      className="flx-input flx-input--has-icon"
                      placeholder="https://fluxer.app"
                      value={serverUrl}
                      onChange={e => {
                        setServerUrl(e.target.value);
                        setVerificationStatus('idle');
                      }}
                      onBlur={handleServerUrlBlur}
                    />
                    <div className="flx-input-icon-btn flx-input-status-icon">
                      {verificationStatus === 'verifying' && <IonSpinner name="crescent" />}
                      {verificationStatus === 'valid' && <IonIcon icon={checkmarkCircleOutline} color="success" />}
                      {verificationStatus === 'invalid' && <IonIcon icon={warningOutline} color="danger" />}
                    </div>
                  </div>
                  {verificationStatus === 'invalid' && verificationError && (
                    <span className="flx-hint flx-hint--error">{verificationError}</span>
                  )}
                  {verificationStatus !== 'invalid' && (
                    <span className="flx-hint">Leave as default for the public instance.</span>
                  )}
                </div>
              )}

              {/* HCaptcha - always show for public instances or when server requires it */}
              {showCaptcha && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--flx-bg-surface)', borderRadius: 8, border: hCaptchaToken ? '1px solid var(--ion-color-success)' : '1px solid var(--flx-separator)' }}>
                  <label className="flx-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Security Check
                    {hCaptchaToken && <span style={{ color: 'var(--ion-color-success)' }}>✓</span>}
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
                    <HCaptcha
                      key="hcaptcha-widget" // Stable key to prevent re-mounting
                      sitekey={discovery?.captcha?.hcaptcha_site_key ?? 'e6e09352-d1e4-4924-80b6-e136c3b1a061'}
                      onVerify={handleCaptchaVerify}
                      host={hCaptchaHost}
                    />
                  </div>
                  {!hCaptchaToken && (
                    <span className="flx-hint" style={{ color: 'var(--ion-color-warning)' }}>
                      ⚠️ Please complete the captcha above before logging in
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        </div>{/* flx-login-center */}
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

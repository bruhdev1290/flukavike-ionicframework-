import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { FluxerWellKnown } from '../types/fluxer';
import { getAppUrl, DEFAULT_APP_URL } from './settings';

// Canonical public-instance origins — all use the same hardcoded fallback
const PUBLIC_ORIGINS = new Set([
  'https://web.fluxer.app',
  'https://fluxer.app',
]);

const DISCOVERY_TTL_MS = 5 * 60 * 1000;

const DEFAULT_ENDPOINTS: FluxerWellKnown = {
  api:     'https://api.fluxer.app/v1',
  gateway: 'wss://gateway.fluxer.app',
  cdn:     'https://cdn.fluxer.app',
  captcha: {
    provider: 'hcaptcha',
    hcaptcha_site_key: 'e6e09352-d1e4-4924-80b6-e136c3b1a061',
  },
};

interface CacheEntry {
  data: FluxerWellKnown;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

// Detect if we're running in a Capacitor native app (iOS/Android)
// This returns true when running as a native app, even with live reload
const isNative = Capacitor.isNativePlatform();

// Check if we're in a web browser (not native)
const isWeb = !isNative;

// In browser dev mode, use proxy to avoid CORS
// In native apps (even with live reload), use full URLs with CapacitorHttp
// NOTE: Force native mode by setting window.forceNative = true in console
const forceNative = typeof window !== 'undefined' && (window as unknown as { forceNative?: boolean }).forceNative === true;
const useProxy = isWeb && import.meta.env.DEV && !forceNative;

export async function discoverEndpoints(instanceBaseUrl?: string): Promise<FluxerWellKnown> {
  const baseUrl = instanceBaseUrl ?? await getAppUrl();

  const cached = cache.get(baseUrl);
  if (cached && Date.now() - cached.fetchedAt < DISCOVERY_TTL_MS) {
    return cached.data;
  }

  // Use proxy path for browser dev server only, direct URL for native apps and production
  console.log(`[discovery] baseUrl=${baseUrl}, isNative=${isNative}, isWeb=${isWeb}, useProxy=${useProxy}`);
  const discoveryUrl = useProxy
    ? `/proxy/.well-known/fluxer`
    : `${baseUrl}/.well-known/fluxer`;

  try {
    const response = await CapacitorHttp.get({
      url: discoveryUrl,
      headers: { Accept: 'application/json' },
    });

    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

    // Guard against HTML responses (e.g. web.fluxer.app serves its SPA at every path)
    if (typeof response.data === 'string' && response.data.trimStart().startsWith('<')) {
      throw new Error('Discovery endpoint returned HTML, not a Fluxer instance');
    }

    // CapacitorHttp auto-parses JSON — guard against string responses on Android
    const raw = typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data;

    const apiUrl = useProxy ? '/proxy/v1' : (raw.endpoints?.api ?? raw.api ?? DEFAULT_ENDPOINTS.api);
    console.log(`[discovery] API URL resolved to: ${apiUrl}`);
    const data: FluxerWellKnown = {
      api:     apiUrl,
      gateway: raw.endpoints?.gateway ?? raw.gateway ?? DEFAULT_ENDPOINTS.gateway,
      cdn:     raw.endpoints?.cdn    ?? raw.cdn    ?? DEFAULT_ENDPOINTS.cdn,
      version: raw.apiCodeVersion,
      captcha: raw.captcha ?? raw.captcha_configuration ?? DEFAULT_ENDPOINTS.captcha,
      features: raw.features ?? raw.feature_configuration,
    };

    cache.set(baseUrl, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    // Public instances: fall back to known defaults rather than throwing
    if (PUBLIC_ORIGINS.has(baseUrl)) {
      console.warn(`Discovery failed for ${baseUrl}, using default endpoints:`, err);
      // In browser dev mode, route API through the Vite proxy to avoid CORS
      if (useProxy) {
        return { ...DEFAULT_ENDPOINTS, api: '/proxy/v1' };
      }
      return DEFAULT_ENDPOINTS;
    }
    throw new Error(
      `Could not discover endpoints for ${baseUrl}. Verify the server URL is correct.`,
    );
  }
}

export async function verifyEndpoint(instanceBaseUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  // Use proxy path for browser dev server only, direct URL for native apps and production
  const verificationUrl = useProxy
    ? `/proxy/.well-known/fluxer`
    : `${instanceBaseUrl}/.well-known/fluxer`;

  try {
    const response = await CapacitorHttp.get({
      url: verificationUrl,
      headers: { Accept: 'application/json' },
      // Shorter timeout for quick verification
      connectTimeout: 5000,
      readTimeout: 5000,
    });

    if (response.status >= 200 && response.status < 300) {
      return { ok: true };
    }
    return { ok: false, error: `Server returned HTTP status ${response.status}` };
  } catch (err) {
    const message = (err as Error).message || 'An unknown network error occurred.';
    if (message.includes('timeout')) {
      return { ok: false, error: 'The request timed out. The server may be offline or unreachable.' };
    }
    if (message.includes('SSL')) {
      return { ok: false, error: 'A secure connection could not be established. Check the server\'s SSL certificate.' };
    }
    return { ok: false, error: `A network error occurred: ${message}` };
  }
}

export function clearDiscoveryCache(): void {
  cache.clear();
}

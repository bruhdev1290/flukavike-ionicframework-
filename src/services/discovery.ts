import { CapacitorHttp } from '@capacitor/core';
import { FluxerWellKnown } from '../types/fluxer';
import { getAppUrl } from './settings';

const DISCOVERY_TTL_MS = 5 * 60 * 1000;

const DEFAULT_ENDPOINTS: FluxerWellKnown = {
  api:     'https://api.fluxer.app/v1',
  gateway: 'wss://gateway.fluxer.app',
  cdn:     'https://cdn.fluxer.app',
};

interface CacheEntry {
  data: FluxerWellKnown;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function discoverEndpoints(instanceBaseUrl?: string): Promise<FluxerWellKnown> {
  const baseUrl = instanceBaseUrl ?? await getAppUrl();

  const cached = cache.get(baseUrl);
  if (cached && Date.now() - cached.fetchedAt < DISCOVERY_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await CapacitorHttp.get({
      url: `${baseUrl}/.well-known/fluxer`,
      headers: { Accept: 'application/json' },
    });

    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

    // CapacitorHttp auto-parses JSON — guard against string responses
    const raw = typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data;

    const data: FluxerWellKnown = {
      api:     raw.endpoints?.api    ?? raw.api    ?? DEFAULT_ENDPOINTS.api,
      gateway: raw.endpoints?.gateway ?? raw.gateway ?? DEFAULT_ENDPOINTS.gateway,
      cdn:     raw.endpoints?.cdn    ?? raw.cdn    ?? DEFAULT_ENDPOINTS.cdn,
      version: raw.apiCodeVersion,
    };

    cache.set(baseUrl, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    // Public instance: fall back to known defaults rather than throwing
    if (baseUrl === 'https://fluxer.app') return DEFAULT_ENDPOINTS;
    throw new Error(
      `Could not discover endpoints for ${baseUrl}. Verify the server URL is correct.`,
    );
  }
}

export function clearDiscoveryCache(): void {
  cache.clear();
}

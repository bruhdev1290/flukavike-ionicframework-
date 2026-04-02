import { CapacitorHttp, HttpOptions, HttpResponse } from '@capacitor/core';
import { FluxerApiError, FluxerHttpError, FluxerRateLimitError } from '../types/fluxer';
import { getStoredToken } from './tokenStore';

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseBody<T>(data: unknown): T {
  // CapacitorHttp auto-parses JSON but may return string on some Android versions
  if (typeof data === 'string' && data.length > 0) {
    try { return JSON.parse(data) as T; } catch { return data as unknown as T; }
  }
  return data as T;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
  attempt = 1,
): Promise<T> {
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extraHeaders,
  };

  // Fluxer user sessions use bare token (no "Bearer" prefix)
  if (token) headers['Authorization'] = token;

  const options: HttpOptions = {
    url,
    headers,
    // CapacitorHttp uses `data` (not `body`) — plain objects are auto-serialized to JSON
    ...(body !== undefined && { data: body }),
  };

  console.log(`[http] ${method} ${url}`, body ? 'with body' : '');

  let response: HttpResponse;
  try {
    switch (method) {
      case 'GET':    response = await CapacitorHttp.get(options);    break;
      case 'POST':   response = await CapacitorHttp.post(options);   break;
      case 'PUT':    response = await CapacitorHttp.put(options);    break;
      case 'PATCH':  response = await CapacitorHttp.patch(options);  break;
      case 'DELETE': response = await CapacitorHttp.delete(options); break;
    }
    console.log(`[http] ${method} ${url} -> ${response.status}`);
  } catch (err) {
    console.error(`[http] ${method} ${url} -> Network error:`, err);
    throw new Error(`Network error: ${(err as Error).message}`);
  }

  // Rate limit — Android OkHttp lowercases headers; iOS URLSession preserves case
  if (response.status === 429) {
    const retryHeader =
      response.headers?.['Retry-After'] ??
      response.headers?.['retry-after'];
    const retryMs = retryHeader
      ? parseFloat(retryHeader) * 1_000
      : BASE_RETRY_DELAY_MS * attempt;

    if (attempt < MAX_RETRY_ATTEMPTS) {
      await sleep(retryMs);
      return request<T>(method, url, body, extraHeaders, attempt + 1);
    }
    throw new FluxerRateLimitError(retryMs / 1_000);
  }

  // 2xx success
  if (response.status >= 200 && response.status < 300) {
    return parseBody<T>(response.data);
  }

  // Non-2xx error
  const apiErr: FluxerApiError = typeof response.data === 'object' && response.data !== null
    ? response.data as FluxerApiError
    : { code: response.status, message: 'An error occurred' };

  throw new FluxerHttpError(response.status, apiErr);
}

export const http = {
  get:    <T>(url: string, headers?: Record<string, string>) =>
    request<T>('GET', url, undefined, headers),
  post:   <T>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>('POST', url, body, headers),
  put:    <T>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>('PUT', url, body, headers),
  patch:  <T>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>('PATCH', url, body, headers),
  delete: <T>(url: string, headers?: Record<string, string>) =>
    request<T>('DELETE', url, undefined, headers),
};

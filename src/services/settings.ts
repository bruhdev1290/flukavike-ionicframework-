/**
 * Mirrors the desktop client's settings.json `app_url` key.
 * Stored in Capacitor Preferences so it persists across app restarts.
 * Default: 'https://web.fluxer.app' — matches the desktop client's stable default.
 */
import { Preferences } from '@capacitor/preferences';

const APP_URL_KEY   = 'fluxer_app_url';
export const DEFAULT_APP_URL = 'https://web.fluxer.app';

export async function getAppUrl(): Promise<string> {
  const { value } = await Preferences.get({ key: APP_URL_KEY });
  return value ?? DEFAULT_APP_URL;
}

export async function setAppUrl(url: string): Promise<void> {
  const normalized = url.trim().replace(/\/$/, '');
  await Preferences.set({ key: APP_URL_KEY, value: normalized });
}

export async function clearAppUrl(): Promise<void> {
  await Preferences.remove({ key: APP_URL_KEY });
}

import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY   = 'fluxer_auth_token';
const USER_ID_KEY = 'fluxer_user_id';

export async function getStoredToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value;
}

export async function setStoredToken(token: string, userId: string): Promise<void> {
  await Preferences.set({ key: TOKEN_KEY,   value: token });
  await Preferences.set({ key: USER_ID_KEY, value: userId });
}

export async function clearStoredToken(): Promise<void> {
  await Preferences.remove({ key: TOKEN_KEY });
  await Preferences.remove({ key: USER_ID_KEY });
}

export async function getStoredUserId(): Promise<string | null> {
  const { value } = await Preferences.get({ key: USER_ID_KEY });
  return value;
}

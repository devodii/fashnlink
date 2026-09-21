import { mobileSessionResponseSchema } from '@tryonlink/shared';
import { API_URL } from '@/lib/config';
import { loadSecureFromStorage, saveSecureToStorage } from '@/store/storage';

const TOKEN_KEY = 'shopper_token';

let inFlight: Promise<string> | null = null;

async function mintShopperToken(): Promise<string> {
  const res = await fetch(`${API_URL}/api/mobile/session`, { method: 'POST' });
  if (!res.ok) throw new Error(`failed to mint shopper session: ${res.status}`);
  const { token } = mobileSessionResponseSchema.parse(await res.json());
  await saveSecureToStorage(TOKEN_KEY, token);
  return token;
}

/**
 * Reads the stored shopper token, minting one on first launch if absent.
 * No refresh flow: the token is a stateless, HMAC-signed, 400-day-lived
 * shopper id (see actions/shoppers.ts), not a short-lived JWT.
 */
export async function getShopperToken(): Promise<string> {
  const existing = await loadSecureFromStorage(TOKEN_KEY);
  if (existing) return existing;

  if (!inFlight) inFlight = mintShopperToken().finally(() => (inFlight = null));
  return inFlight;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getShopperToken();
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

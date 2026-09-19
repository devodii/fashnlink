import { SOURCE_LANGUAGE_CODE } from '@/config/languages';

const COOKIE_NAME = 'googtrans';

// DECISION: Google's widget reads this cookie on load and translates the DOM
// (section 10.7) — it is the entire interface between our picker and the
// widget, so every helper here is a thin read/write around it, nothing more.
export function readGoogTransCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCurrentLanguageCode(): string {
  const cookie = readGoogTransCookie();
  if (!cookie) return SOURCE_LANGUAGE_CODE;
  const parts = cookie.split('/');
  return parts[2] || SOURCE_LANGUAGE_CODE;
}

function apexDomain(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : hostname;
}

/** Sets the cookie and reloads — this is the only way to drive the widget
 * (section 10.7), there's no imperative "translate now" API to call instead. */
export function setLanguage(code: string) {
  if (typeof document === 'undefined') return;

  if (code === SOURCE_LANGUAGE_CODE) {
    document.cookie = `${COOKIE_NAME}=; path=/; domain=${apexDomain(location.hostname)}; max-age=0`;
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  } else {
    const value = encodeURIComponent(`/${SOURCE_LANGUAGE_CODE}/${code}`);
    document.cookie = `${COOKIE_NAME}=${value}; path=/; domain=${apexDomain(location.hostname)}`;
  }

  try {
    localStorage.setItem('lang', code);
  } catch {
    // private window / blocked storage — the cookie is the source of truth
  }

  location.reload();
}

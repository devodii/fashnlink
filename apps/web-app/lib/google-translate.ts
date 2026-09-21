import { SOURCE_LANGUAGE_CODE } from '@/constants';

const COOKIE_NAME = 'googtrans';

/**
 * Google's translate widget has no imperative API. It reads this cookie on
 * load and translates the DOM from it, so every helper here is a thin
 * read/write around the cookie.
 */
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
    // ignored, the cookie is the source of truth
  }

  location.reload();
}

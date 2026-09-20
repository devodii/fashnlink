export function formatPriceCents(cents: number | null, currency: string | null): string {
  if (cents === null) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      currencyDisplay: 'narrowSymbol',
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ''}`.trim();
  }
}

export function toAbsoluteUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

export function parsePriceStringToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Math.round(input * 100);
  const cleaned = input.replace(/,/g, '').trim();
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  return Math.round(parseFloat(match[0]) * 100);
}

export function centsFromMinorUnits(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

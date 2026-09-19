// Generic display formatters used across shopper/merchant pages and the
// share card (section 9.1) — the inverse of scraper/shared/price.ts's
// string-to-cents parsing.
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

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

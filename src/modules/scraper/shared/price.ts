const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '£': 'GBP',
  '€': 'EUR',
};

// "$48.00", "48.00", "1,284.50" -> 4800 (cents).
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

export function detectCurrencySymbol(input: string): string | null {
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (input.includes(symbol)) return code;
  }
  return null;
}

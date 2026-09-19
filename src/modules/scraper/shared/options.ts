// Section 6.4: option-name -> size/color/other mapping, case-insensitive,
// shared by every adapter so none of them reimplement it.
const SIZE_NAMES = new Set(['size', 'sizes', 'taille', 'größe', 'groesse', 'talla']);
const COLOR_NAMES = new Set(['color', 'colour', 'couleur', 'farbe']);

export type OptionKind = 'size' | 'color' | 'other';

export function classifyOptionName(name: string): OptionKind {
  const key = name.trim().toLowerCase();
  if (SIZE_NAMES.has(key)) return 'size';
  if (COLOR_NAMES.has(key)) return 'color';
  return 'other';
}

// Given a variant's option name/value pairs (adapter-specific shape already
// reduced to `{ name, value }[]`), returns the normalized size/color/other
// triple used by `NormalizedProductVariant`.
export function mapVariantOptions(optionPairs: { name: string; value: string }[]): {
  size: string | null;
  color: string | null;
  other: string | null;
} {
  let size: string | null = null;
  let color: string | null = null;
  const otherParts: string[] = [];

  for (const { name, value } of optionPairs) {
    const kind = classifyOptionName(name);
    if (kind === 'size') size = value;
    else if (kind === 'color') color = value;
    else otherParts.push(value);
  }

  return { size, color, other: otherParts.length ? otherParts.join(' / ') : null };
}

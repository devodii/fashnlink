// Section 6.4: option-name -> size/color/other mapping, case-insensitive,
// shared by every adapter so none of them reimplement it.
const SIZE_NAMES = ['size', 'sizes', 'taille', 'größe', 'groesse', 'talla'];
const COLOR_NAMES = ['color', 'colour', 'couleur', 'farbe'];

export type OptionKind = 'size' | 'color' | 'other';

// DECISION: section 6.4 specifies an exact match against these lists, but a
// real WooCommerce fixture (heroicthread.com) uses the compound attribute
// name "Fabric Color" — a real store, not a hypothetical edge case — which an
// exact match would silently drop into "other", losing real color data.
// Substring matching keeps the documented exact-name case working unchanged
// while also catching compound names like this.
export function classifyOptionName(name: string): OptionKind {
  const key = name.trim().toLowerCase();
  if (SIZE_NAMES.some((word) => key.includes(word))) return 'size';
  if (COLOR_NAMES.some((word) => key.includes(word))) return 'color';
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

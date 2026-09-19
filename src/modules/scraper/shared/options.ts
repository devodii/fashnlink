const SIZE_NAMES = ['size', 'sizes', 'taille', 'größe', 'groesse', 'talla'];
const COLOR_NAMES = ['color', 'colour', 'couleur', 'farbe'];

export type OptionKind = 'size' | 'color' | 'other';

// Substring match, not exact: a real WooCommerce store (heroicthread.com)
// uses the compound attribute name "Fabric Color", which an exact match
// would silently drop into "other".
export function classifyOptionName(name: string): OptionKind {
  const key = name.trim().toLowerCase();
  if (SIZE_NAMES.some((word) => key.includes(word))) return 'size';
  if (COLOR_NAMES.some((word) => key.includes(word))) return 'color';
  return 'other';
}

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

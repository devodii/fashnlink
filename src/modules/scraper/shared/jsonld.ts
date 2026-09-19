import { parsePriceStringToCents } from './price';

// Section 6.5 (generic adapter): parse every `<script type="application/ld+json">`
// block, walk `@graph`, find a `Product` or `ProductGroup` (`hasVariant[]`).
// Regex-extracted rather than a full DOM parse — no HTML parser is in the
// dependency list (section 2), and JSON-LD blocks are trivially isolated by
// their own script tag.
export type JsonLdOffer = {
  price?: string | number;
  priceCurrency?: string;
  availability?: string;
};

export type JsonLdProduct = {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string };
  brand?: string | { name?: string };
  sku?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
  hasVariant?: JsonLdProduct[];
  [key: string]: unknown;
};

export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // malformed JSON-LD on the page — skip it, not our bug to fix.
    }
  }
  return blocks;
}

function hasType(node: JsonLdProduct, type: string): boolean {
  const t = node['@type'];
  if (!t) return false;
  return Array.isArray(t) ? t.includes(type) : t === type;
}

function flatten(node: unknown): JsonLdProduct[] {
  if (!node || typeof node !== 'object') return [];
  const obj = node as Record<string, unknown>;
  const out: JsonLdProduct[] = [];
  if (Array.isArray(obj['@graph'])) {
    for (const child of obj['@graph'] as unknown[]) out.push(...flatten(child));
  } else {
    out.push(obj as JsonLdProduct);
  }
  return out;
}

export function findProduct(blocks: unknown[]): JsonLdProduct | null {
  for (const block of blocks) {
    const roots = Array.isArray(block) ? block.flatMap(flatten) : flatten(block);
    const product = roots.find((node) => hasType(node, 'Product') || hasType(node, 'ProductGroup'));
    if (product) return product;
  }
  return null;
}

export function jsonLdImages(image: JsonLdProduct['image']): string[] {
  if (!image) return [];
  if (typeof image === 'string') return [image];
  if (Array.isArray(image)) return image.filter((i): i is string => typeof i === 'string');
  if (typeof image === 'object' && image.url) return [image.url];
  return [];
}

export function jsonLdOffers(offers: JsonLdProduct['offers']): JsonLdOffer[] {
  if (!offers) return [];
  return Array.isArray(offers) ? offers : [offers];
}

export function jsonLdPriceCents(offers: JsonLdOffer[]): number | null {
  const first = offers[0];
  return first ? parsePriceStringToCents(first.price ?? null) : null;
}

export function jsonLdAvailable(offers: JsonLdOffer[]): boolean {
  const first = offers[0];
  if (!first?.availability) return true;
  return !/OutOfStock/i.test(first.availability);
}

export function jsonLdBrand(brand: JsonLdProduct['brand']): string | null {
  if (!brand) return null;
  return typeof brand === 'string' ? brand : (brand.name ?? null);
}

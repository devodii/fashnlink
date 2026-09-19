import type { GarmentCategory } from '@/modules/scraper/types';

// Section 6.6 — garment category from productType/tags/title, keyword table
// first, vision fallback only when nothing here matches.
export const GARMENT_CATEGORY_KEYWORDS: Record<Exclude<GarmentCategory, 'unknown'>, string[]> = {
  top: ['shirt', 'tee', 't-shirt', 'blouse', 'top', 'sweater', 'hoodie', 'cardigan', 'tank'],
  bottom: ['skirt', 'trousers', 'pants', 'jeans', 'shorts', 'leggings'],
  one_piece: ['dress', 'gown', 'jumpsuit', 'romper', 'saree', 'lehenga', 'abaya', 'kaftan'],
  outerwear: ['jacket', 'coat', 'blazer', 'parka', 'windbreaker'],
  shoes: ['shoes', 'sneakers', 'boots', 'heels', 'sandals', 'loafers', 'slides'],
  accessory: [
    'hat',
    'cap',
    'beanie',
    'scarf',
    'ring',
    'necklace',
    'bracelet',
    'earrings',
    'watch',
    'sunglasses',
    'glasses',
    'belt',
    'gloves',
    'tie',
    'handbag',
    'backpack',
    'crossbody',
  ],
  set: ['set', 'suit', 'co-ord', 'coord'],
};

export function categoryFromKeywords(text: string): GarmentCategory | null {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(GARMENT_CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category as GarmentCategory;
  }
  return null;
}

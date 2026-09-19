/**
 * stage 1; free, synchronous text scoring before any image ever
 * touches the model. Keep this list-shaped and boring; it's the thing a human
 * tunes, not a place for cleverness.
 */

export const WEARABLE_POSITIVE = [
  // garments
  'shirt',
  'tee',
  't-shirt',
  'blouse',
  'top',
  'dress',
  'gown',
  'skirt',
  'trousers',
  'pants',
  'jeans',
  'shorts',
  'jacket',
  'coat',
  'blazer',
  'hoodie',
  'sweater',
  'cardigan',
  'jumpsuit',
  'romper',
  'set',
  'abaya',
  'kaftan',
  'agbada',
  'kimono',
  'saree',
  'lehenga',
  'kurta',
  'suit',
  'swimwear',
  'bikini',
  'lingerie',
  'activewear',
  'leggings',
  // footwear
  'shoes',
  'sneakers',
  'boots',
  'heels',
  'sandals',
  'loafers',
  'slides',
  // headwear
  'hat',
  'cap',
  'beanie',
  'headwrap',
  'gele',
  'scarf',
  'hijab',
  'bandana',
  // accessories worn on the body
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
] as const;

export const WEARABLE_NEGATIVE = [
  'mug',
  'candle',
  'poster',
  'print',
  'sticker',
  'phone case',
  'gift card',
  'e-book',
  'ebook',
  'download',
  'subscription',
  'fabric by the yard',
  'yarn',
  'pattern',
  'home',
  'decor',
  'furniture',
  'pet',
  'supplement',
  'skincare',
  'perfume',
] as const;

/**
 * Matched separately from WEARABLE_NEGATIVE (section 6.7: "kids (→ kids)") ;
 * a kids match short-circuits straight to the `kids` verdict, it does not
 * just add negative weight to the wearable/not-wearable score.
 */
export const KIDS_KEYWORDS = ['kids', 'baby', 'toddler', 'infant'] as const;

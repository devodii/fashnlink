import type { GarmentCategory } from '@/db/schema';

export const WEARABLE_GATE = `You are screening product photos for a virtual try-on app. For EACH image, decide whether it shows a single wearable item (something a person wears on their body: clothing, shoes, headwear, eyewear, jewelry, a bag, or another worn accessory) that is clearly usable as a try-on source photo.

Return one JSON object per image with exactly these fields:
- is_wearable: boolean, true only if the image's main subject is something worn on the body.
- wearable_type: one of "garment" | "footwear" | "headwear" | "eyewear" | "jewelry" | "bag" | "accessory" | "none".
- garment_category: one of "top" | "bottom" | "one_piece" | "outerwear" | "shoes" | "accessory" | "set" | "unknown"; "unknown" if wearable_type is not "garment".
- subject_count: integer, how many distinct products/items appear in the image (a collage or lookbook with several items is > 1).
- image_kind: one of "flat_lay" | "ghost_mannequin" | "on_model" | "detail" | "lifestyle" | "logo_or_graphic" | "other".
- is_minor_present: boolean, true if a child appears to be wearing or modeling the item.
- usable_for_tryon: boolean, true only if there is a single item, clearly visible, not cropped, and not a graphic/logo rendering of it.
- confidence: number between 0 and 1.
- reason: one short sentence explaining the call.

Be conservative: mugs, candles, posters, stickers, gift cards, and other non-worn merchandise are never wearable. A product photo showing several different products together (a lookbook grid, a "shop the look" collage) has subject_count greater than 1 even if every item in it is individually wearable.`;

/**
 * A fast, cheap vision check deciding which of the two twin-generation
 * prompts below applies to a given photo.
 */
export const TWIN_PHOTO_CLASSIFY = `Look at this photo of a person. Return one JSON object with exactly these fields:
- is_full_body: boolean, true only if the person's full body, head to feet (or at least head to knees), is visible and unobstructed.
- is_minor_present: boolean, true if the person appears to be under 18.
- confidence: number between 0 and 1.`;

export const TWIN_BACKGROUND_CLEANUP = `Replace the background with a plain neutral light-gray studio backdrop. Keep the person, their pose, their face, their skin tone, and their exact clothing completely unchanged. Do not alter their body shape or proportions.`;

export const TWIN_STUDIO_GENERATION = `Generate a full-body, head-to-feet photo of this exact person in a standing neutral pose, on a plain neutral light-gray studio backdrop, wearing plain neutral basics (a fitted white t-shirt and gray trousers). Preserve their face, skin tone, hair, and body proportions exactly as shown. Photorealistic, even studio lighting, no props.`;

export const WEARABLE_GATE_JEV_IS_WEARABLE = `Based only on the product's title, product type, tags, description, and any image alt text/filenames given, is this something a person wears on their body, such as clothing, shoes, headwear, eyewear, jewelry, a bag, or another worn accessory? Answer false for home goods, mugs, candles, posters, gift cards, digital products/subscriptions, furniture, decor, pet products, or anything not worn on a person's body.`;

export const WEARABLE_GATE_JEV_IS_KIDS = `Based only on the product's title, product type, tags, and description, is this product intended for babies, toddlers, or children rather than adults?`;

export const WEARABLE_GATE_JEV_GARMENT_CATEGORY = `Based only on the product's title, product type, tags, description, and any image alt text/filenames given, which category best fits this product?`;

/**
 * One short description per db/schema.ts `garmentCategoryEnum` value, used to
 * build Jev's `garment_category` choice criteria in wearable-gate.ts (the
 * enum values themselves are iterated there, not hand-listed a third time ;
 * this map only has to stay exhaustive over GarmentCategory, which TypeScript
 * already enforces).
 */
export const WEARABLE_GATE_JEV_GARMENT_CATEGORY_DESCRIPTIONS: Record<GarmentCategory, string> = {
  top: 'Shirts, blouses, t-shirts, sweaters, tank tops, worn on the upper body only.',
  bottom: 'Pants, jeans, shorts, skirts, worn on the lower body only.',
  one_piece: 'Dresses, jumpsuits, rompers, a single garment covering both upper and lower body.',
  outerwear: 'Jackets, coats, blazers, cardigans, worn over other clothing.',
  shoes: 'Footwear of any kind.',
  accessory:
    'Jewelry, eyewear, headwear, bags, belts, or other worn accessories, not a garment or shoe.',
  set: 'A matching multi-piece outfit sold as one product (e.g. a top-and-bottom set).',
  unknown: 'Wearable, but none of the above fit, or not enough information to tell.',
};

export const IMAGE_EDIT_TRYON = `The first image shows a person. The second image shows an item they are wearing/carrying. Edit the first image so the person is wearing/carrying the exact item from the second image, in a natural and realistic way. Keep the person's face, body, pose, and background from the first image completely unchanged. Match the item's true color, pattern, and material from the second image exactly.`;

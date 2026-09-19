// Section 6.7/14: no inline prompts anywhere else in the codebase — every
// model prompt lives here so tuning one doesn't mean hunting through adapter
// or job files.

export const WEARABLE_GATE = `You are screening product photos for a virtual try-on app. For EACH image, decide whether it shows a single wearable item (something a person wears on their body: clothing, shoes, headwear, eyewear, jewelry, a bag, or another worn accessory) that is clearly usable as a try-on source photo.

Return one JSON object per image with exactly these fields:
- is_wearable: boolean — true only if the image's main subject is something worn on the body.
- wearable_type: one of "garment" | "footwear" | "headwear" | "eyewear" | "jewelry" | "bag" | "accessory" | "none".
- garment_category: one of "top" | "bottom" | "one_piece" | "outerwear" | "shoes" | "accessory" | "set" | "unknown" — "unknown" if wearable_type is not "garment".
- subject_count: integer — how many distinct products/items appear in the image (a collage or lookbook with several items is > 1).
- image_kind: one of "flat_lay" | "ghost_mannequin" | "on_model" | "detail" | "lifestyle" | "logo_or_graphic" | "other".
- is_minor_present: boolean — true if a child appears to be wearing or modeling the item.
- usable_for_tryon: boolean — true only if there is a single item, clearly visible, not cropped, and not a graphic/logo rendering of it.
- confidence: number between 0 and 1.
- reason: one short sentence explaining the call.

Be conservative: mugs, candles, posters, stickers, gift cards, and other non-worn merchandise are never wearable. A product photo showing several different products together (a lookbook grid, a "shop the look" collage) has subject_count greater than 1 even if every item in it is individually wearable.`;

// Section 7.2 (twin creation), Stage 1: a fast, cheap vision check deciding
// which of the two twin-generation prompts below applies to a given photo.
export const TWIN_PHOTO_CLASSIFY = `Look at this photo of a person. Return one JSON object with exactly these fields:
- is_full_body: boolean — true only if the person's full body, head to feet (or at least head to knees), is visible and unobstructed.
- is_minor_present: boolean — true if the person appears to be under 18.
- confidence: number between 0 and 1.`;

// Section 7.2: for a full-body photo, keep the person identical and only
// clean up the background.
export const TWIN_BACKGROUND_CLEANUP = `Replace the background with a plain neutral light-gray studio backdrop. Keep the person, their pose, their face, their skin tone, and their exact clothing completely unchanged. Do not alter their body shape or proportions.`;

// Section 7.2: for a selfie/half-body photo, generate a full-body studio
// image that still looks like the same person.
export const TWIN_STUDIO_GENERATION = `Generate a full-body, head-to-feet photo of this exact person in a standing neutral pose, on a plain neutral light-gray studio backdrop, wearing plain neutral basics (a fitted white t-shirt and gray trousers). Preserve their face, skin tone, hair, and body proportions exactly as shown. Photorealistic, even studio lighting, no props.`;

// Section 7.1: nano_banana's fallback/accessory render path (routing table,
// src/config/models.ts) — no dedicated try-on prompt is given in the spec,
// so this is a first-image-is-the-person, second-image-is-the-item edit
// instruction, written for nano-banana-2/edit's "describe what changed, keep
// the rest" style (fal.ai/models/fal-ai/nano-banana-2/edit/api).
export const NANO_BANANA_TRYON = `The first image shows a person. The second image shows an item they are wearing/carrying. Edit the first image so the person is wearing/carrying the exact item from the second image, in a natural and realistic way. Keep the person's face, body, pose, and background from the first image completely unchanged. Match the item's true color, pattern, and material from the second image exactly.`;

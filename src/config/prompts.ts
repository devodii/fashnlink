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

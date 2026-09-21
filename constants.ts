import { z } from 'zod';
import type { GarmentCategory } from '@/db/schema';

// ------------------------------ CONTACT CHANNEL ------------------------------

export const CONTACT_CHANNEL_TYPES = ['whatsapp', 'instagram', 'email'] as const;

export const contactChannelSchema = z.object({
  type: z.enum(CONTACT_CHANNEL_TYPES),
  value: z.string().min(1),
});

export type ContactChannelType = (typeof CONTACT_CHANNEL_TYPES)[number];
export type ContactChannel = z.infer<typeof contactChannelSchema>;

// ------------------------------ LANGUAGES ------------------------------

export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  rtl?: boolean;
  /** One-line auto-suggest prompt shown when a visitor's browser language
   * matches this code and no choice has been made yet. */
  suggestPrompt: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', suggestPrompt: '' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', suggestPrompt: 'Voir en français ?' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', suggestPrompt: 'Auf Deutsch ansehen?' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', suggestPrompt: '¿Ver en español?' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', suggestPrompt: 'Vedere in italiano?' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', suggestPrompt: 'Ver em português?' },
  {
    code: 'nl',
    label: 'Dutch',
    nativeLabel: 'Nederlands',
    suggestPrompt: 'Bekijk in het Nederlands?',
  },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski', suggestPrompt: 'Zobaczyć po polsku?' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', suggestPrompt: 'Türkçe görüntüle?' },
  {
    code: 'ar',
    label: 'Arabic',
    nativeLabel: 'العربية',
    rtl: true,
    suggestPrompt: 'عرض بالعربية؟',
  },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', suggestPrompt: 'हिन्दी में देखें?' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', suggestPrompt: '日本語で見ますか？' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', suggestPrompt: '한국어로 보시겠어요?' },
  {
    code: 'zh-CN',
    label: 'Chinese (Simplified)',
    nativeLabel: '简体中文',
    suggestPrompt: '查看简体中文？',
  },
];

export const SOURCE_LANGUAGE_CODE = 'en';

// ------------------------------ LIMITS ------------------------------

// rate limit numbers live here, nowhere inline.
export const RENDERS_PER_LINK_SHOPPER_PER_DAY = 3;
export const TWIN_CREATIONS_PER_SHOPPER_PER_DAY = 10;
export const SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR = 60;
// marketing homepage's live quick-demo, abuse guard by IP.
export const QUICK_LINK_DEMO_PER_IP_PER_DAY = 3;
// custom-site tracking script's public ingestion endpoint, abuse guard by token.
export const TRACK_INGEST_REQUESTS_PER_TOKEN_PER_HOUR = 120;
export const TRACK_INGEST_MAX_PATHS_PER_REQUEST = 100;
export const DISCOVERED_PATHS_MAX_PER_STORE = 500;

// new drop campaigns.
export const MAX_DROP_PRODUCTS = 3;
export const MAX_DROP_ITEMS = 2000;
// Requires at least this many resolved items before the failure rate is
// trusted, since evaluating too early (e.g. 1 failure out of 2 items = 50%)
// would pause almost every real campaign on noise.
export const DROP_FAILURE_PAUSE_MIN_SAMPLE = 10;
export const DROP_FAILURE_PAUSE_RATE = 0.2;

// ------------------------------ MODELS ------------------------------

/**
 * Render providers, invoked through fal's queue API
 * (https://queue.fal.run/{modelId}) for fashn and nano_banana, and directly
 * through OpenAI's synchronous images API for openai_image. Model ids
 * verified against each provider's live docs on 2026-09-19, not guessed:
 * https://fal.ai/models/fal-ai/fashn/tryon/v1.6/api
 * https://fal.ai/models/fal-ai/nano-banana-2/edit/api
 * https://developers.openai.com/api/docs/models/gpt-image-2
 *
 * Kling Kolors Virtual Try-On v1.5 was checked against its live fal.ai page
 * and is deprecated there ("This model is no longer supported"), with no
 * direct multi-garment replacement in fal's current try-on catalog, so it
 * has been dropped entirely rather than routed to a dead endpoint. Nano
 * Banana 2 accepts up to 14 reference images per edit, which covers the
 * multi-garment `set` case Kling used to handle.
 */
export type ProviderKey = 'fashn' | 'nano_banana' | 'openai_image';

export const MODEL_IDS: Record<ProviderKey, string> = {
  fashn: 'fal-ai/fashn/tryon/v1.6',
  nano_banana: 'fal-ai/nano-banana-2/edit',
  openai_image: 'gpt-image-2',
};

/** Updated here when a provider's per-call pricing changes; nowhere else references these numbers. */
export const PROVIDER_COST_CENTS: Record<ProviderKey, number> = {
  fashn: 8, // ~$0.075/render
  nano_banana: 8, // ~$0.08/render
  openai_image: 5, // ~$0.042/render, gpt-image-2 standard quality
};

export const ROUTING: Record<GarmentCategory, ProviderKey[]> = {
  top: ['fashn', 'nano_banana'],
  bottom: ['fashn', 'nano_banana'],
  one_piece: ['fashn', 'nano_banana'],
  outerwear: ['fashn', 'nano_banana'],
  set: ['nano_banana', 'openai_image'],
  shoes: ['nano_banana', 'openai_image'],
  accessory: ['nano_banana', 'openai_image'],
  unknown: ['nano_banana', 'openai_image'],
};

// ------------------------------ PRICING ------------------------------

export type PlanKey = 'free' | 'founder' | 'starter' | 'growth';

export const PLANS: Record<
  PlanKey,
  {
    name: string;
    priceCents: number | null;
    period: 'once' | 'month' | null;
    // Credits granted immediately on reaching this plan. Free's recurring
    // monthly top-up is a cron concern, not modeled here.
    creditsOnGrant: number;
    watermark: boolean;
    overageCentsPerRender: number | null;
  }
> = {
  free: {
    name: 'Free',
    priceCents: 0,
    period: null,
    creditsOnGrant: 20,
    watermark: true,
    overageCentsPerRender: null,
  },
  founder: {
    name: 'Founder',
    priceCents: 19900,
    period: 'once',
    creditsOnGrant: 1000,
    watermark: false,
    overageCentsPerRender: null,
  },
  starter: {
    name: 'Starter',
    priceCents: 4900,
    period: 'month',
    creditsOnGrant: 300,
    watermark: false,
    overageCentsPerRender: 15,
  },
  growth: {
    name: 'Growth',
    priceCents: 14900,
    period: 'month',
    creditsOnGrant: 1200,
    watermark: false,
    overageCentsPerRender: 12,
  },
};

export const MODEL_PACK_CREDIT_COST = 15;
export const MODEL_PACK_MAX_PRODUCTS = 5;
export const MODEL_PACK_STOCK_MODEL_COUNT = 3;

export const FOUNDING_PASS_SEATS_TOTAL = 30;

export function formatPriceCents(cents: number | null): string {
  if (cents === null) return 'Free';
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

// ------------------------------ PROMPTS ------------------------------

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

// ------------------------------ WEARABLE KEYWORDS ------------------------------

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

// A match here short-circuits straight to the kids verdict rather than
// adding negative weight to the wearable/not-wearable score.
export const KIDS_KEYWORDS = ['kids', 'baby', 'toddler', 'infant'] as const;

// ------------------------------ PRODUCT PATH KEYWORDS ------------------------------
// Same lightweight positives-minus-negatives scoring pattern as the wearable
// gate's text stage (scoreCandidateText), applied to a discovered path +
// link text instead of a product's title/tags: signal for "does this look
// like a product page" on an arbitrary custom site, not garment-wearability.

export const PRODUCT_PATH_POSITIVE = [
  'product',
  'products',
  'shop',
  'shopping',
  'store',
  'collection',
  'collections',
  'item',
  'items',
  'buy',
  'catalog',
  'catalogue',
  'goods',
  'merch',
  'gear',
  'sale',
  'new-arrivals',
  'bestseller',
  'bestsellers',
] as const;

export const PRODUCT_PATH_NEGATIVE = [
  'about',
  'blog',
  'cart',
  'checkout',
  'contact',
  'privacy',
  'terms',
  'policy',
  'faq',
  'help',
  'support',
  'account',
  'login',
  'signup',
  'register',
  'returns',
  'shipping',
  'careers',
  'jobs',
  'press',
  'news',
  'wishlist',
  'search',
  'sitemap',
  'legal',
  'cookie',
  'affiliate',
  'newsletter',
] as const;

// Path segments that, as the first path segment, strongly imply a product
// listing/detail page regardless of link text.
export const PRODUCT_PATH_SEGMENT_PREFIXES = [
  'product',
  'products',
  'shop',
  'collections',
  'collection',
  'p',
  'item',
  'items',
] as const;

export const PRICE_LIKE_PATTERN = /(\$|£|€)\s?\d+(\.\d{2})?/;

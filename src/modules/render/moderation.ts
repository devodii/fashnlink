import { err, ok, type Result } from '@/lib/result';
import { openai } from '@/lib/openai';

/**
 * OpenAI moderation on every shopper photo before any model
 * call. `omni-moderation-latest` per spec section 2; the only model this
 * module is allowed to name inline (it's the moderation endpoint identifier
 * itself, not a tunable prompt/price/limit, section 14's concern).
 */
const MODERATION_MODEL = 'omni-moderation-latest';

/**
 * Categories that block outright (section 7.4: "Block on sexual content,
 * sexual/minors, violence").
 */
const BLOCKING_CATEGORIES = ['sexual', 'sexual/minors', 'violence', 'violence/graphic'] as const;

export async function moderateImage(imageUrl: string): Promise<Result<void>> {
  try {
    const response = await openai.moderations.create({
      model: MODERATION_MODEL,
      input: [{ type: 'image_url', image_url: { url: imageUrl } }],
    });

    const result = response.results[0];
    if (!result) {
      return err({ code: 'INTERNAL', message: 'moderation returned no result' });
    }

    const flaggedCategory = BLOCKING_CATEGORIES.find(
      (category) => result.categories[category as keyof typeof result.categories],
    );

    if (flaggedCategory) {
      return err({
        code: 'MODERATION_BLOCKED',
        message: 'This photo can’t be used.',
        meta: { category: flaggedCategory },
      });
    }

    return ok(undefined);
  } catch (cause) {
    return err({ code: 'INTERNAL', message: 'moderation check failed', cause });
  }
}

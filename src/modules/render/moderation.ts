import { err, ok, type Result } from '@/lib/result';
import { openai } from '@/lib/openai';

const MODERATION_MODEL = 'omni-moderation-latest';

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

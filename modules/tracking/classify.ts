import { experimental_evaluate as evaluate } from 'ai';
import { jevModel } from '@/lib/jev';
import type { Logger } from '@/lib/log';

export type PathCandidate = {
  path: string;
  linkText: string | null;
};

export type PathScore = {
  score: number;
  signals: string[];
};

const JEV_IS_PRODUCT_PATH =
  'Is this URL path likely a page where a shopper could view and buy a specific product (a product detail or product listing/collection page), as opposed to a non-product page like cart, checkout, account, blog, policy, contact, or other informational content?';

// Scales Jev's [0, 1] probability into the same rough magnitude the old
// keyword scorer produced (small signed integers, 0 = neutral), so
// discovered_paths.score and its downstream consumers keep their contract.
function scoreFromProbability(probability: number): number {
  return Math.round((probability - 0.5) * 20);
}

export async function scoreDiscoveredPath(
  candidate: PathCandidate,
  log: Logger,
): Promise<PathScore> {
  try {
    const result = await evaluate({
      model: jevModel,
      state: { path: candidate.path, linkText: candidate.linkText },
      questions: {
        is_product_path: { type: 'boolean', instructions: JEV_IS_PRODUCT_PATH },
      },
    });

    const answer = result.answers.is_product_path;
    if (answer.type !== 'boolean') {
      log.warn({ candidate }, 'tracking classify: unexpected jev answer shape, scoring neutral');
      return { score: 0, signals: ['jev:unexpected-shape'] };
    }

    return {
      score: scoreFromProbability(answer.probability),
      signals: ['jev', `probability:${answer.probability.toFixed(2)}`],
    };
  } catch (cause) {
    log.warn({ cause, candidate }, 'tracking classify: jev call failed, scoring neutral');
    return { score: 0, signals: ['jev:error'] };
  }
}

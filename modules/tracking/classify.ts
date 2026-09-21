import {
  PRICE_LIKE_PATTERN,
  PRODUCT_PATH_NEGATIVE,
  PRODUCT_PATH_POSITIVE,
  PRODUCT_PATH_SEGMENT_PREFIXES,
} from '@/constants';

export type PathCandidate = {
  path: string;
  linkText: string | null;
};

export type PathScore = {
  score: number;
  signals: string[];
};

export function scoreDiscoveredPath(candidate: PathCandidate): PathScore {
  const pathLower = candidate.path.toLowerCase();
  const textLower = (candidate.linkText ?? '').toLowerCase();
  const haystack = `${pathLower} ${textLower}`;

  const matchedPositive = PRODUCT_PATH_POSITIVE.filter((word) => haystack.includes(word));
  const matchedNegative = PRODUCT_PATH_NEGATIVE.filter((word) => haystack.includes(word));
  const hasPriceLike = PRICE_LIKE_PATTERN.test(textLower);

  const segments = pathLower.split('/').filter(Boolean);
  const hasProductLikeSegment = PRODUCT_PATH_SEGMENT_PREFIXES.includes(
    segments[0] as (typeof PRODUCT_PATH_SEGMENT_PREFIXES)[number],
  );

  let score = matchedPositive.length - 2 * matchedNegative.length;
  if (hasPriceLike) score += 2;
  if (hasProductLikeSegment) score += 2;

  const signals = [
    ...matchedPositive,
    ...(hasPriceLike ? ['price-like'] : []),
    ...(hasProductLikeSegment ? [`segment:${segments[0]}`] : []),
  ];

  return { score, signals };
}

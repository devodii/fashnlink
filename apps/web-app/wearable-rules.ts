import type { Eligibility, GarmentCategory, WearableType } from '@tryonlink/shared/schema';

export type ImageVisionVerdict = {
  is_wearable: boolean;
  wearable_type: WearableType;
  garment_category: GarmentCategory;
  subject_count: number;
  image_kind: string;
  is_minor_present: boolean;
  usable_for_tryon: boolean;
  confidence: number;
  reason: string;
};

const MIN_SHORT_EDGE_PX = 512;

export const WEARABLE_TYPE_CATEGORY: Partial<Record<WearableType, GarmentCategory>> = {
  jewelry: 'accessory',
  eyewear: 'accessory',
  headwear: 'accessory',
  bag: 'accessory',
  accessory: 'accessory',
  footwear: 'shoes',
};

export type FinalWearabilityVerdict = {
  eligibility: Eligibility;
  eligibilityReason: string;
  wearableType: WearableType;
  garmentCategory: GarmentCategory;
  tryonSourceIndex: number | null;
};

export function resolveVerdict(
  perImage: { verdict: ImageVisionVerdict; width: number | null; height: number | null }[],
): FinalWearabilityVerdict {
  const anyMinor = perImage.some((i) => i.verdict.is_minor_present);
  if (anyMinor) {
    return {
      eligibility: 'kids',
      eligibilityReason: 'vision:minor_present',
      wearableType: 'none',
      garmentCategory: 'unknown',
      tryonSourceIndex: null,
    };
  }

  const eligibleIndex = perImage.findIndex((i) => {
    const shortEdge = Math.min(i.width ?? Infinity, i.height ?? Infinity);
    return (
      i.verdict.is_wearable &&
      i.verdict.usable_for_tryon &&
      i.verdict.subject_count === 1 &&
      !i.verdict.is_minor_present &&
      i.verdict.confidence >= 0.7 &&
      shortEdge >= MIN_SHORT_EDGE_PX
    );
  });

  if (eligibleIndex >= 0) {
    const verdict = perImage[eligibleIndex].verdict;
    const garmentCategory =
      verdict.garment_category !== 'unknown'
        ? verdict.garment_category
        : (WEARABLE_TYPE_CATEGORY[verdict.wearable_type] ?? 'unknown');
    return {
      eligibility: 'eligible',
      eligibilityReason: verdict.reason,
      wearableType: verdict.wearable_type,
      garmentCategory,
      tryonSourceIndex: eligibleIndex,
    };
  }

  const anyWearable = perImage.some((i) => i.verdict.is_wearable);
  if (anyWearable) {
    return {
      eligibility: 'no_usable_image',
      eligibilityReason: 'vision:no_usable_image',
      wearableType: perImage.find((i) => i.verdict.is_wearable)?.verdict.wearable_type ?? 'none',
      garmentCategory: 'unknown',
      tryonSourceIndex: null,
    };
  }

  return {
    eligibility: 'not_wearable',
    eligibilityReason: 'vision:not_wearable',
    wearableType: 'none',
    garmentCategory: 'unknown',
    tryonSourceIndex: null,
  };
}

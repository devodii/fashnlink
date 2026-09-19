import { describe, expect, it } from 'vitest';
import { scoreCandidateText, type WearabilityCandidate } from './wearable-gate';
import cases from '../../../tests/fixtures/scraper/wearable-gate/cases.json';

type FixtureCase = {
  id: string;
  title: string;
  productType: string;
  tags: string[];
  group: string;
  expectedStage1: 'not_wearable' | 'kids' | 'needs_vision';
};

function toCandidate(fixture: FixtureCase): WearabilityCandidate {
  return {
    title: fixture.title,
    productType: fixture.productType,
    tags: fixture.tags,
    descriptionText: '',
    images: [],
  };
}

/**
 * Stage 1 is unit-tested without the model; the 40-example
 * fixture set (20 wearable, 10 non-wearable, 5 collages, 5 kids).
 */
describe('scoreCandidateText (wearable gate stage 1)', () => {
  it('has exactly 40 fixture cases', () => {
    expect((cases as FixtureCase[]).length).toBe(40);
  });

  for (const fixture of cases as FixtureCase[]) {
    it(`${fixture.id} (${fixture.group}): "${fixture.title}" -> ${fixture.expectedStage1}`, () => {
      const result = scoreCandidateText(toCandidate(fixture));

      if (fixture.expectedStage1 === 'kids') {
        expect(result.isKids).toBe(true);
        return;
      }

      expect(result.isKids).toBe(false);
      if (fixture.expectedStage1 === 'not_wearable') {
        expect(result.score).toBeLessThanOrEqual(-1);
      } else {
        expect(result.score).toBeGreaterThan(-1);
      }
    });
  }
});

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Suspense } from 'react';
import { Button } from './ui/button';
import { SwatchPicker } from './swatch-picker';
import { StepWizard } from './step-wizard';

const BRAND_OPTIONS = [1, 2, 3].map((n) => ({ id: String(n), token: `brand-${n}` }));

function Demo() {
  return (
    <Suspense fallback={null}>
      <StepWizard
        steps={[
          {
            id: 'product',
            title: 'Product',
            render: (api) => (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Step 1 of 3 — paste a product link.</p>
                <Button type="button" onClick={api.next}>
                  Continue
                </Button>
              </div>
            ),
          },
          {
            id: 'brand',
            title: 'Brand',
            optional: true,
            render: (api) => (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Step 2 of 3 — pick an accent.</p>
                <SwatchPicker options={BRAND_OPTIONS} value="1" onChange={() => {}} />
                <Button type="button" onClick={api.next}>
                  Continue
                </Button>
              </div>
            ),
          },
          {
            id: 'done',
            title: 'Done',
            render: () => (
              <p className="text-sm text-muted-foreground">Step 3 of 3 — your link is ready.</p>
            ),
          },
        ]}
      />
    </Suspense>
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/StepWizard',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

// No interaction story here: StepWizard's current step is derived entirely
// from `useSearchParams()` (no local React state fallback), and Storybook's
// mocked next/navigation doesn't reflect a `router.push()` call back into
// `useSearchParams()`, so a click-through can't be proven in this
// environment — the real URL-persistence behavior is already covered by the
// app's own integration tests.

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

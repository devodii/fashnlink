import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { SwatchField } from './swatch-field';

const BRAND_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), token: `brand-${n}` }));

const meta: Meta = {
  title: 'components/forms/SwatchField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ accent: z.string() })} defaultValues={{ accent: '' }}>
      {(control) => (
        <SwatchField control={control} name="accent" label="Accent" options={BRAND_OPTIONS} />
      )}
    </FieldStory>
  ),
};

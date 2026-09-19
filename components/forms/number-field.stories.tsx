import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { NumberField } from './number-field';

const meta: Meta = {
  title: 'components/forms/NumberField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory
      schema={z.object({ price: z.number().optional() })}
      defaultValues={{ price: undefined }}
    >
      {(control) => <NumberField control={control} name="price" label="Price" placeholder="48" />}
    </FieldStory>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { MultiSelectField } from './multi-select-field';

const meta: Meta = {
  title: 'components/forms/MultiSelectField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ tags: z.array(z.string()) })} defaultValues={{ tags: [] }}>
      {(control) => (
        <MultiSelectField
          control={control}
          name="tags"
          label="Tags"
          options={[
            { value: 'new', label: 'New' },
            { value: 'sale', label: 'Sale' },
            { value: 'bestseller', label: 'Bestseller' },
          ]}
        />
      )}
    </FieldStory>
  ),
};

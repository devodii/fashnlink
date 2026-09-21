import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { SelectField } from './select-field';

const meta: Meta = {
  title: 'components/forms/SelectField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ category: z.string() })} defaultValues={{ category: '' }}>
      {(control) => (
        <SelectField
          control={control}
          name="category"
          label="Category"
          options={[
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'shoes', label: 'Shoes' },
          ]}
        />
      )}
    </FieldStory>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { RadioGroupField } from './radio-group-field';

const meta: Meta = {
  title: 'components/forms/RadioGroupField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ size: z.string() })} defaultValues={{ size: '' }}>
      {(control) => (
        <RadioGroupField
          control={control}
          name="size"
          label="Size"
          options={[
            { value: 's', label: 'S' },
            { value: 'm', label: 'M' },
            { value: 'l', label: 'L' },
          ]}
        />
      )}
    </FieldStory>
  ),
};

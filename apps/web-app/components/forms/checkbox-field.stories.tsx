import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { CheckboxField } from './checkbox-field';

const meta: Meta = {
  title: 'components/forms/CheckboxField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ consent: z.boolean() })} defaultValues={{ consent: false }}>
      {(control) => (
        <CheckboxField
          control={control}
          name="consent"
          label="I am 18 or older and this is a photo of me"
        />
      )}
    </FieldStory>
  ),
};

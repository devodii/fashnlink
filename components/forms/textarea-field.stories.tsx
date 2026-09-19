import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { TextareaField } from './textarea-field';

const meta: Meta = {
  title: 'components/forms/TextareaField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ description: z.string() })} defaultValues={{ description: '' }}>
      {(control) => <TextareaField control={control} name="description" label="Description" />}
    </FieldStory>
  ),
};

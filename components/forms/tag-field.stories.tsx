import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { TagField } from './tag-field';

const meta: Meta = {
  title: 'components/forms/TagField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ labels: z.array(z.string()) })} defaultValues={{ labels: [] }}>
      {(control) => (
        <TagField control={control} name="labels" label="Labels" placeholder="Add a label…" />
      )}
    </FieldStory>
  ),
};

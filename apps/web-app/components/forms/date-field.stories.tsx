import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { DateField } from './date-field';

const meta: Meta = {
  title: 'components/forms/DateField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ releaseDate: z.string() })} defaultValues={{ releaseDate: '' }}>
      {(control) => <DateField control={control} name="releaseDate" label="Release date" />}
    </FieldStory>
  ),
};

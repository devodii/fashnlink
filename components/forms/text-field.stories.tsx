import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { expect } from 'storybook/test';
import { FieldStory } from './story-utils';
import { TextField } from './text-field';

const meta: Meta = {
  title: 'components/forms/TextField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ title: z.string() })} defaultValues={{ title: '' }}>
      {(control) => (
        <TextField control={control} name="title" label="Title" placeholder="Linen shirt" />
      )}
    </FieldStory>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <FieldStory schema={z.object({ title: z.string() })} defaultValues={{ title: '' }}>
      {(control) => (
        <TextField
          control={control}
          name="title"
          label="Title"
          description="Shown on the product page."
        />
      )}
    </FieldStory>
  ),
};

export const TypesIntoField: Story = {
  render: () => (
    <FieldStory schema={z.object({ title: z.string() })} defaultValues={{ title: '' }}>
      {(control) => <TextField control={control} name="title" label="Title" />}
    </FieldStory>
  ),
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText('Title');
    await userEvent.type(input, 'Linen shirt');
    await expect(input).toHaveValue('Linen shirt');
  },
};

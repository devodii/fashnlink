import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { EmailField } from './email-field';

const meta: Meta = {
  title: 'components/forms/EmailField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ email: z.string() })} defaultValues={{ email: '' }}>
      {(control) => <EmailField control={control} name="email" label="Email" />}
    </FieldStory>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { SwitchField } from './switch-field';

const meta: Meta = {
  title: 'components/forms/SwitchField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ notify: z.boolean() })} defaultValues={{ notify: false }}>
      {(control) => (
        <SwitchField
          control={control}
          name="notify"
          label="Send me looks"
          description="Unsubscribe anytime."
        />
      )}
    </FieldStory>
  ),
};

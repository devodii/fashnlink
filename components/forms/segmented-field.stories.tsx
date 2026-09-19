import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { SegmentedField } from './segmented-field';

const meta: Meta = {
  title: 'components/forms/SegmentedField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ channel: z.string() })} defaultValues={{ channel: 'whatsapp' }}>
      {(control) => (
        <SegmentedField
          control={control}
          name="channel"
          label="Contact channel"
          options={[
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'email', label: 'Email' },
          ]}
        />
      )}
    </FieldStory>
  ),
};

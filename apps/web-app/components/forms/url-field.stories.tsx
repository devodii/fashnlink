import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { FieldStory } from './story-utils';
import { UrlField } from './url-field';

const meta: Meta = {
  title: 'components/forms/UrlField',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <FieldStory schema={z.object({ url: z.string() })} defaultValues={{ url: '' }}>
      {(control) => (
        <UrlField
          control={control}
          name="url"
          label="Product URL"
          placeholder="yourshop.com/products/linen-shirt"
        />
      )}
    </FieldStory>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CopyField } from './copy-field';

const meta: Meta<typeof CopyField> = {
  component: CopyField,
  title: 'components/CopyField',
  tags: ['ai-generated'],
  args: { value: 'https://example.com/t/abc123', label: 'Link' },
};
export default meta;

type Story = StoryObj<typeof CopyField>;

export const Default: Story = {};
export const Truncated: Story = { args: { truncate: true } };

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AvatarStack } from './avatar-stack';

const meta: Meta<typeof AvatarStack> = {
  component: AvatarStack,
  title: 'components/AvatarStack',
  tags: ['ai-generated'],
  args: {
    items: [{ alt: 'AB' }, { alt: 'CD' }, { alt: 'EF' }, { alt: 'GH' }],
  },
};
export default meta;

type Story = StoryObj<typeof AvatarStack>;

export const Default: Story = { args: { max: 3 } };
export const ShowAll: Story = { args: { max: 5 } };
export const Small: Story = { args: { size: 'sm', max: 3 } };
export const Large: Story = { args: { size: 'lg', max: 3 } };

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PhoneFrame } from './phone-frame';

const meta: Meta<typeof PhoneFrame> = {
  component: PhoneFrame,
  title: 'components/PhoneFrame',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof PhoneFrame>;

export const WithChildren: Story = {
  args: {
    children: (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Preview
      </div>
    ),
  },
};

export const WithIframeSrc: Story = {
  args: { src: 'about:blank' },
};

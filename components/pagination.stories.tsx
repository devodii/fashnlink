import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Pagination } from './pagination';

const meta: Meta<typeof Pagination> = {
  component: Pagination,
  title: 'components/Pagination',
  tags: ['ai-generated'],
  args: { pageIndex: 2, pageCount: 8, onPageChange: () => {} },
};
export default meta;

type Story = StoryObj<typeof Pagination>;

export const Default: Story = {};
export const FirstPage: Story = { args: { pageIndex: 0 } };
export const LastPage: Story = { args: { pageIndex: 7 } };

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PollOptions } from './poll-options';

const OPTIONS = [
  { id: 'a', image: 'https://picsum.photos/seed/7/300/400', label: 'Look A', votes: 6 },
  { id: 'b', image: 'https://picsum.photos/seed/8/300/400', label: 'Look B', votes: 4 },
];

const meta: Meta<typeof PollOptions> = {
  component: PollOptions,
  title: 'components/PollOptions',
  tags: ['ai-generated'],
  args: { options: OPTIONS, onVote: () => {} },
};
export default meta;

type Story = StoryObj<typeof PollOptions>;

export const Voting: Story = {};
export const Results: Story = { args: { results: true } };
export const Voted: Story = { args: { results: true, value: 'a' } };

export const Mobile: Story = {
  args: { results: true },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

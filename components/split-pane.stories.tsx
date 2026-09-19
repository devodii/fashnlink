import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SplitPane } from './split-pane';

const Pane = ({ label }: { label: string }) => (
  <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">{label}</div>
);

const meta: Meta<typeof SplitPane> = {
  component: SplitPane,
  title: 'components/SplitPane',
  tags: ['ai-generated'],
  args: {
    start: <Pane label="Start pane" />,
    end: <Pane label="End pane" />,
  },
};
export default meta;

type Story = StoryObj<typeof SplitPane>;

export const EqualSplit: Story = { args: { ratio: '1:1' } };
export const WideStart: Story = { args: { ratio: '2:1' } };
export const WideEnd: Story = { args: { ratio: '1:2' } };

export const Mobile: Story = {
  args: { ratio: '1:1' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

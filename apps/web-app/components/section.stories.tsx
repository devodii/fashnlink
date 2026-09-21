import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Section } from './section';

const meta: Meta<typeof Section> = {
  component: Section,
  title: 'components/Section',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Section>;

export const Default: Story = {
  args: {
    title: 'Data display',
    description: 'Links, renders, leads: everything a merchant checks daily.',
    children: <div className="rounded-md border border-border bg-card p-4 text-sm">Content</div>,
  },
};

export const WithAside: Story = {
  args: {
    title: 'Products',
    aside: <span className="text-xs text-muted-foreground">12 eligible</span>,
    children: <div className="rounded-md border border-border bg-card p-4 text-sm">Content</div>,
  },
};

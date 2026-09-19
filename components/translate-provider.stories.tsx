import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TranslateProvider } from './translate-provider';

const meta: Meta<typeof TranslateProvider> = {
  component: TranslateProvider,
  title: 'components/TranslateProvider',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof TranslateProvider>;

// A script-injecting context provider, not a visible component — this story
// only proves it mounts and renders its children without throwing.
export const Default: Story = {
  args: {
    children: <p className="text-sm text-muted-foreground">Page content</p>,
  },
};

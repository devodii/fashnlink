import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Package, ShoppingBag } from '@phosphor-icons/react/ssr';
import { AppShell, type NavItem } from './app-shell';

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '#dashboard', icon: ShoppingBag, active: true },
  { label: 'Products', href: '#products', icon: Package },
];

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  title: 'components/AppShell',
  tags: ['ai-generated'],
  args: {
    nav: NAV,
    user: { name: 'Studio Ada', email: 'hello@studioada.com' },
    children: (
      <div className="rounded-md border border-border bg-card p-6 text-sm">Page content</div>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof AppShell>;

export const Default: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

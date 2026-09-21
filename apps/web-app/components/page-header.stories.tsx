import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './ui/button';
import { PageHeader } from './page-header';

const meta: Meta<typeof PageHeader> = {
  component: PageHeader,
  title: 'components/PageHeader',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Component gallery',
    description:
      'Every reusable component, in its default, loading, empty, error, and mobile states.',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Links',
    description: '12 active links',
    actions: <Button type="button">New link</Button>,
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    title: 'Linen shirt',
    breadcrumbs: [{ label: 'Products', href: '#' }, { label: 'Linen shirt' }],
  },
};

export const Mobile: Story = {
  args: { title: 'Links', actions: <Button type="button">New link</Button> },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PricingCard } from './pricing-card';

const meta: Meta<typeof PricingCard> = {
  component: PricingCard,
  title: 'components/PricingCard',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof PricingCard>;

export const Founder: Story = {
  args: {
    name: 'Founder',
    price: '$199',
    features: ['1,000 credits, never expire', 'No watermark'],
    cta: { label: 'Buy' },
    highlight: true,
  },
};

export const Starter: Story = {
  args: {
    name: 'Starter',
    price: '$49',
    period: 'month',
    features: ['300 credits / month', 'No watermark'],
    cta: { label: 'Choose plan' },
  },
};

export const WithNote: Story = {
  args: {
    ...Founder.args,
    note: '30 seats left',
  },
};

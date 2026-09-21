import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CreditMeter } from './credit-meter';

const meta: Meta<typeof CreditMeter> = {
  component: CreditMeter,
  title: 'components/CreditMeter',
  tags: ['ai-generated'],
  args: { balance: 840, reserved: 60, cap: 1000 },
};
export default meta;

type Story = StoryObj<typeof CreditMeter>;

export const Full: Story = {};
export const Compact: Story = { args: { variant: 'compact' } };
export const NoReservation: Story = { args: { reserved: 0 } };
export const Low: Story = { args: { balance: 40, reserved: 0, cap: 1000 } };

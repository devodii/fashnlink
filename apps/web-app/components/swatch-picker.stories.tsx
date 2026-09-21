import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { SwatchPicker } from './swatch-picker';

const BRAND_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), token: `brand-${n}` }));

function Demo() {
  const [value, setValue] = React.useState('2');
  return <SwatchPicker options={BRAND_OPTIONS} value={value} onChange={setValue} />;
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/SwatchPicker',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

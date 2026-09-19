import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { Stepper } from './stepper';

function Demo() {
  const [value, setValue] = React.useState(1);
  return <Stepper value={value} onChange={setValue} min={0} max={5} />;
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/Stepper',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { expect } from 'storybook/test';
import { SegmentedControl } from './segmented-control';

function Demo() {
  const [value, setValue] = React.useState('single');
  return (
    <SegmentedControl
      value={value}
      onChange={setValue}
      options={[
        { value: 'single', label: 'Single' },
        { value: 'poll', label: 'Poll' },
        { value: 'group', label: 'Group' },
      ]}
    />
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/SegmentedControl',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const SwitchesOnClick: Story = {
  play: async ({ canvas, userEvent }) => {
    const pollOption = canvas.getByRole('radio', { name: 'Poll' });
    await userEvent.click(pollOption);
    await expect(pollOption).toHaveAttribute('aria-checked', 'true');
  },
};

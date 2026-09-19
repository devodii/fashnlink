import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { expect } from 'storybook/test';
import { TagInput } from './tag-input';

function Demo({ initial = ['new'] }: { initial?: string[] }) {
  const [value, setValue] = React.useState<string[]>(initial);
  return <TagInput value={value} onChange={setValue} placeholder="Add a tag…" />;
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/TagInput',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const Empty: Story = { args: { initial: [] } };

export const AddsOnEnter: Story = {
  args: { initial: [] },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByPlaceholderText('Add a tag…');
    await userEvent.type(input, 'sale{enter}');
    await expect(await canvas.findByText('sale')).toBeVisible();
  },
};

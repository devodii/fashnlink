import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { FilterBar, type FilterValue } from './filter-bar';

function Demo() {
  const [value, setValue] = React.useState<FilterValue>({});
  return (
    <FilterBar
      value={value}
      onChange={setValue}
      filters={[
        {
          type: 'select',
          key: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
          ],
        },
        { type: 'toggle', key: 'eligible', label: 'Eligible only' },
      ]}
    />
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/FilterBar',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { VariantPicker } from './variant-picker';

function Demo() {
  const [value, setValue] = React.useState<Record<string, string>>({ Size: 's', Color: 'black' });
  return (
    <VariantPicker
      options={[
        {
          name: 'Size',
          values: [
            { id: 's', label: 'S', available: true },
            { id: 'm', label: 'M', available: true },
            { id: 'l', label: 'L', available: false },
          ],
        },
        {
          name: 'Color',
          values: [
            { id: 'black', label: 'Black', available: true },
            { id: 'oatmeal', label: 'Oatmeal', available: true },
          ],
        },
      ]}
      value={value}
      onChange={(name, valueId) => setValue((v) => ({ ...v, [name]: valueId }))}
    />
  );
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/VariantPicker',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

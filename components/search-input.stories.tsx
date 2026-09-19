import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { SearchInput } from './search-input';

function Demo(props: React.ComponentProps<typeof SearchInput>) {
  const [value, setValue] = React.useState(props.value ?? '');
  return <SearchInput {...props} value={value} onChange={setValue} />;
}

const meta: Meta<typeof Demo> = {
  component: Demo,
  title: 'components/SearchInput',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof Demo>;

export const Empty: Story = { args: { value: '' } };
export const WithValue: Story = { args: { value: 'linen shirt' } };

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LanguagePicker } from './language-picker';

const meta: Meta<typeof LanguagePicker> = {
  component: LanguagePicker,
  title: 'components/LanguagePicker',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof LanguagePicker>;

export const Default: Story = {};
export const Compact: Story = { args: { compact: true } };

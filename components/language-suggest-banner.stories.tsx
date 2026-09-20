import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LanguageSuggestBanner } from './language-suggest-banner';

const meta: Meta<typeof LanguageSuggestBanner> = {
  component: LanguageSuggestBanner,
  title: 'components/LanguageSuggestBanner',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof LanguageSuggestBanner>;

// Renders nothing by default in Storybook: it only shows when the browser's
// navigator.language differs from the site default and no googtrans cookie
// or dismissal is set yet; Chromium's default locale (en-US) means this
// story's canvas is intentionally empty most of the time, which is itself
// the correct "no-op" state to document.
export const Default: Story = {};

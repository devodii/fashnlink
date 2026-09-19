import type { Preview } from '@storybook/nextjs-vite';
import * as React from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { TooltipProvider } from '../components/ui/tooltip';
import { Toaster } from '../components/ui/sonner';
import '../app/globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    backgrounds: { disable: true },
    // StepWizard reads next/navigation's useRouter/useSearchParams for its
    // `?step=` URL persistence, so the App Router context needs mocking.
    nextjs: { appDirectory: true },
  },
  globalTypes: {
    theme: {
      description: 'Light / dark token theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
      return (
        <div
          className={`${geistSans.variable} ${geistMono.variable} ${theme} min-h-screen bg-background p-6 text-foreground antialiased`}
        >
          <TooltipProvider>
            <Story />
          </TooltipProvider>
          <Toaster />
        </div>
      );
    },
  ],
};

export default preview;

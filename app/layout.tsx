import type { Metadata } from 'next';
import { Outfit, Instrument_Serif } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { TranslateProvider } from '@/components/translate-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { GlobalTopBar } from '@/components/global-top-bar';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-display-instrument',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'App',
  description: 'Send a link. They see it on themselves.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      translate="yes"
      className={`${outfit.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body data-gt-root className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <QueryProvider>
            <TranslateProvider>
              <TooltipProvider>{children}</TooltipProvider>
              <GlobalTopBar />
              <Toaster />
            </TranslateProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

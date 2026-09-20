import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { TranslateProvider } from '@/components/translate-provider';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
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
      className={`${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body data-gt-root className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TranslateProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </TranslateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

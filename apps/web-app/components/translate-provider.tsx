'use client';

import * as React from 'react';
import Script from 'next/script';
import { readGoogTransCookie, setLanguage } from '@/lib/google-translate';

declare global {
  interface Window {
    __gtInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: {
          new (
            options: { pageLanguage: string; autoDisplay: boolean; layout: unknown },
            mountId: string,
          ): unknown;
          InlineLayout: { SIMPLE: unknown };
        };
      };
    };
  }
}

interface TranslateErrorBoundaryState {
  hasError: boolean;
}

/**
 * Google's translate widget mutates text nodes directly, which can throw
 * `NotFoundError: removeChild` when React re-renders the same subtree. This
 * is the one class component in the codebase (error boundaries must be
 * class components), scoped to exactly this mitigation: on that one error it
 * clears the cookie and reloads instead of white-screening; any other error
 * rethrows for a real error boundary higher up to handle.
 */
class TranslateErrorBoundary extends React.Component<
  { children: React.ReactNode },
  TranslateErrorBoundaryState
> {
  state: TranslateErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): TranslateErrorBoundaryState | null {
    if (error.name === 'NotFoundError' && error.message.includes('removeChild')) {
      return { hasError: true };
    }
    return null;
  }

  componentDidCatch(error: Error) {
    if (error.name === 'NotFoundError' && error.message.includes('removeChild')) {
      setLanguage('en');
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function TranslateProvider({ children }: { children: React.ReactNode }) {
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (readGoogTransCookie()) setShouldLoad(true);
  }, []);

  React.useEffect(() => {
    window.__gtInit = () => {
      if (!window.google?.translate) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        'gt-mount',
      );
    };
  }, []);

  return (
    <TranslateErrorBoundary>
      {shouldLoad && (
        <Script
          src="https://translate.google.com/translate_a/element.js?cb=__gtInit"
          strategy="afterInteractive"
        />
      )}
      <div id="gt-mount" className="hidden" aria-hidden />
      {children}
    </TranslateErrorBoundary>
  );
}

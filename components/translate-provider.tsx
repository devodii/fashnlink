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
 * DECISION: Google's widget mutates text nodes directly, which
 * can throw `NotFoundError: removeChild` when React re-renders the same
 * subtree. Error boundaries must be class components; this is the one class
 * component in the codebase, scoped to exactly this mitigation. On that one
 * error it clears the cookie once and reloads instead of white-screening;
 * any other error is not our concern and rethrows for a real error boundary
 * higher up (or the framework's default) to handle.
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

/** Mounted once in the root layout. Injects Google's page
 * translator only when a translation is already active (the `googtrans`
 * cookie is set); never on first paint for the default language, so there's
 * no script cost or layout jump for the common case. */
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

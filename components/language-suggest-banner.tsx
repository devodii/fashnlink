'use client';

import * as React from 'react';
import { LANGUAGES, SOURCE_LANGUAGE_CODE } from '@/config/languages';
import { readGoogTransCookie, setLanguage } from '@/lib/google-translate';
import { InlineAlert } from '@/components/inline-alert';
import { Button } from '@/components/ui/button';

/** Section 10.7: on first visit, if `navigator.language` matches a supported
 * language and the visitor hasn't chosen or dismissed one yet, offers a
 * one-line translate prompt — the shopper page (section 8.3) mounts this at
 * the top. No widget script is loaded just to show this; the prompt text is
 * a static string per language (`languages.ts`). */
export function LanguageSuggestBanner() {
  const [suggested, setSuggested] = React.useState<(typeof LANGUAGES)[number] | null>(null);

  React.useEffect(() => {
    if (readGoogTransCookie()) return;
    try {
      if (localStorage.getItem('langDismissed')) return;
    } catch {
      // private window — fall through and offer the suggestion anyway
    }

    const browserCode = navigator.language.split('-')[0];
    const match = LANGUAGES.find(
      (l) => l.code === browserCode || l.code.startsWith(`${browserCode}-`),
    );
    if (match && match.code !== SOURCE_LANGUAGE_CODE) setSuggested(match);
  }, []);

  if (!suggested) return null;

  function dismiss() {
    try {
      localStorage.setItem('langDismissed', '1');
    } catch {
      // ignore — worst case the prompt reappears next visit
    }
    setSuggested(null);
  }

  return (
    <InlineAlert
      title={suggested.suggestPrompt}
      className="[&_[data-slot=alert-description]]:flex [&_[data-slot=alert-description]]:items-center [&_[data-slot=alert-description]]:gap-2"
    >
      <Button type="button" size="sm" onClick={() => setLanguage(suggested.code)}>
        Yes
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
        No
      </Button>
    </InlineAlert>
  );
}

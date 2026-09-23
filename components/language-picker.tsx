'use client';

import * as React from 'react';
import { GlobeIcon } from '@phosphor-icons/react/ssr';
import { LANGUAGES, SOURCE_LANGUAGE_CODE } from '@/constants';
import { getCurrentLanguageCode, setLanguage } from '@/lib/google-translate';
import { useIsDesktop } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResponsiveDialog } from '@/components/responsive-dialog';

export interface LanguagePickerProps {
  compact?: boolean;
  className?: string;
}

const INIT_TIMEOUT_MS = 3000;

export function LanguagePicker({ compact, className }: LanguagePickerProps) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  // document.cookie is client-only, so the initial render always assumes
  // the source language and syncs to the real value in an effect, avoiding
  // a hydration mismatch.
  const [currentCode, setCurrentCode] = React.useState(SOURCE_LANGUAGE_CODE);

  React.useEffect(() => {
    setCurrentCode(getCurrentLanguageCode());
  }, []);

  const current = LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0];

  React.useEffect(() => {
    if (currentCode === 'en') return;
    const timeout = setTimeout(() => {
      if (!window.google?.translate) setHidden(true);
    }, INIT_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [currentCode]);

  if (hidden) return null;

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size={compact ? 'icon' : 'sm'}
      className={className}
      aria-label={compact ? 'Change language' : undefined}
    >
      <GlobeIcon className="size-4" />
      {!compact && <span translate="no">{current.nativeLabel}</span>}
    </Button>
  );

  const options = LANGUAGES.map((lang) => (
    <button
      key={lang.code}
      type="button"
      translate="no"
      onClick={() => setLanguage(lang.code)}
      dir={lang.rtl ? 'rtl' : undefined}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      <span>{lang.nativeLabel}</span>
      {lang.code === currentCode && <span className="text-xs text-muted-foreground">✓</span>}
    </button>
  ));

  if (isDesktop) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              translate="no"
              dir={lang.rtl ? 'rtl' : undefined}
              onClick={() => setLanguage(lang.code)}
            >
              <span className="flex-1">{lang.nativeLabel}</span>
              {lang.code === currentCode && (
                <span className="text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Language">
        <div className="max-h-80 space-y-0.5 overflow-y-auto">{options}</div>
      </ResponsiveDialog>
    </>
  );
}

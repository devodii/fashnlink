'use client';

import * as React from 'react';
import Link from 'next/link';
import { ListIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LanguagePicker } from '@/components/language-picker';
import { ThemeToggle } from '@/components/theme-toggle';
import { Container } from '@/components/container';

const NAV_ITEMS = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Retargeting', href: '/#retargeting' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Platforms', href: '/#platforms' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/80 backdrop-blur-sm transition-[border-color]',
        scrolled ? 'border-b border-border' : 'border-b border-transparent',
      )}
    >
      <Container size="lg" className="flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-xl text-foreground">
          TRYON LINK
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="lg" className="h-11 rounded-md px-5">
            <Link href="/login">Start free</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button asChild size="sm" className="h-9 rounded-md">
            <Link href="/login">Start free</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Open menu">
                <ListIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs">
              <SheetHeader>
                <SheetTitle className="font-display text-lg">TRYON LINK</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2.5 text-sm text-foreground hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  Log in
                </Link>
              </nav>
              <div className="mt-auto border-t border-border px-4 py-4">
                <LanguagePicker />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}

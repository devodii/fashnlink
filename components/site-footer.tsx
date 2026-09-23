import Link from 'next/link';
import { Container } from '@/components/container';
import { LanguagePicker } from '@/components/language-picker';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Retargeting', href: '/#retargeting' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    heading: 'Merchants',
    links: [
      { label: 'Start free', href: '/login' },
      { label: 'Founder pass', href: '/pricing' },
      { label: 'Platforms', href: '/#platforms' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
    ],
  },
  {
    heading: 'Company',
    links: [{ label: 'Contact', href: 'mailto:hello@tryonlink.com' }],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container size="lg" className="flex flex-col gap-12 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2 flex flex-col gap-3">
            <span className="font-display text-xl text-foreground">TRYON LINK</span>
            <p className="max-w-xs text-sm text-muted-foreground">
              Send a link. They see your fashion on themselves. Every try-on is a lead you can
              retarget.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.heading} className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">{column.heading}</p>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TRYON LINK. All rights reserved.
          </p>
          <LanguagePicker compact />
        </div>
      </Container>
    </footer>
  );
}

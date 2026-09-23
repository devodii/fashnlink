import Link from 'next/link';
import { SparkleIcon } from '@phosphor-icons/react/ssr';
import { PLANS, formatPriceCents } from '@/constants';

export function FounderPassTopBanner() {
  return (
    <Link
      href="/pricing"
      className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground hover:underline"
    >
      <SparkleIcon className="size-4 shrink-0" weight="light" />
      Founder pass: {formatPriceCents(PLANS.founder.priceCents)} once, 30 seats. See pricing.
    </Link>
  );
}

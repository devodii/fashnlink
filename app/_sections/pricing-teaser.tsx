import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/container';
import { BlurFade } from '@/components/motion/blur-fade';
import { FOUNDING_PASS_SEATS_TOTAL, PLANS, formatPriceCents } from '@/constants';

export function PricingTeaser({ foundersSold }: { foundersSold: number }) {
  const seatsRemaining = Math.max(FOUNDING_PASS_SEATS_TOTAL - foundersSold, 0);

  return (
    <section className="py-16">
      <Container size="lg">
        <BlurFade>
          <Card className="flex flex-col items-center justify-between gap-6 p-8 md:flex-row">
            <div className="flex flex-col gap-1 text-center md:text-left">
              <p className="font-display text-2xl text-foreground">
                Start free. Founder pass, {formatPriceCents(PLANS.founder.priceCents)} once, 30
                seats.
              </p>
              <p className="text-muted-foreground">
                1,000 try-ons that never expire, no watermark, retargeting included.
              </p>
              {foundersSold >= 3 && (
                <p className="text-sm text-muted-foreground">
                  {seatsRemaining} of {FOUNDING_PASS_SEATS_TOTAL} seats left
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-3">
              <Button asChild size="lg" className="h-11 rounded-md px-5">
                <Link href="/login">Start free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-md px-5">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </Card>
        </BlurFade>
      </Container>
    </section>
  );
}

import { CheckIcon } from '@phosphor-icons/react/ssr';
import { retrieveMerchants } from '@/actions/merchants';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LandingSection } from '@/components/landing-section';
import { Container } from '@/components/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PricingCard } from '@/components/pricing-card';
import { BlurFade } from '@/components/motion/blur-fade';
import { PLANS, FOUNDING_PASS_SEATS_TOTAL, formatPriceCents } from '@/constants';
import { PricingComparison } from './pricing-comparison';
import { PricingCalculator } from './pricing-calculator';
import { PricingFaq } from './pricing-faq';

const FOUNDER_FEATURES = [
  '1,000 try-ons, never expire',
  'Unlimited links, polls and group links',
  'No watermark',
  'Lead capture + CSV',
  'Klaviyo / Mailchimp retargeting',
  'Price locked forever',
];

export default async function PricingPage() {
  const founders = await retrieveMerchants({ plan: 'founder' });
  const seatsRemaining = Math.max(FOUNDING_PASS_SEATS_TOTAL - founders.length, 0);
  const showSeatCounter = founders.length >= 3;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-background">
        <section className="py-20 md:py-28">
          <Container size="md" className="flex flex-col items-center gap-4 text-center">
            <BlurFade className="flex flex-col items-center gap-4">
              <h1 className="font-display text-5xl leading-[0.95] tracking-[-0.02em] text-foreground md:text-7xl">
                Simple credits. One try-on, one credit.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Failed try-ons are refunded automatically. Retargeting emails reuse the render and
                cost nothing extra.
              </p>
            </BlurFade>
          </Container>
        </section>

        <section className="pb-20 md:pb-28">
          <Container size="lg" className="flex flex-col gap-8">
            <BlurFade>
              <Card className="flex flex-col gap-6 border-foreground p-8 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl text-foreground">Founder</p>
                    <Badge variant="outline">30 seats</Badge>
                  </div>
                  <p className="text-2xl font-medium text-foreground" translate="no">
                    {formatPriceCents(PLANS.founder.priceCents)}
                    <span className="text-sm font-normal text-muted-foreground"> once</span>
                  </p>
                  <ul className="flex flex-col gap-2">
                    {FOUNDER_FEATURES.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {showSeatCounter && (
                    <p className="text-sm text-muted-foreground">
                      {seatsRemaining} of {FOUNDING_PASS_SEATS_TOTAL} seats left
                    </p>
                  )}
                </div>
                <Button asChild size="lg" className="h-11 shrink-0 rounded-md px-5">
                  <a href="/login">Buy founding pass</a>
                </Button>
              </Card>
            </BlurFade>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <BlurFade delay={0.05}>
                <PricingCard
                  name={PLANS.free.name}
                  price={formatPriceCents(PLANS.free.priceCents)}
                  features={[
                    '20 try-ons to start, 10/month',
                    '1 active link',
                    'Small watermark',
                    'Leads visible after upgrade',
                  ]}
                  cta={{ label: 'Start free', href: '/login' }}
                />
              </BlurFade>
              <BlurFade delay={0.1}>
                <PricingCard
                  name={PLANS.starter.name}
                  price={formatPriceCents(PLANS.starter.priceCents)}
                  period="month"
                  features={[
                    '300 try-ons/month',
                    'No watermark',
                    'Lead capture + CSV',
                    'Klaviyo / Mailchimp retargeting',
                  ]}
                  cta={{ label: 'Coming after founders', disabled: true }}
                  note="Disabled until subscriptions ship"
                />
              </BlurFade>
              <BlurFade delay={0.15}>
                <PricingCard
                  name={PLANS.growth.name}
                  price={formatPriceCents(PLANS.growth.priceCents)}
                  period="month"
                  features={[
                    '1,200 try-ons/month',
                    'No watermark',
                    'Lead capture + CSV',
                    'Klaviyo / Mailchimp retargeting',
                  ]}
                  cta={{ label: 'Coming after founders', disabled: true }}
                  note="Disabled until subscriptions ship"
                />
              </BlurFade>
            </div>
          </Container>
        </section>

        <LandingSection eyebrow="Compare" title="Every plan, side by side." containerSize="lg">
          <PricingComparison />
        </LandingSection>

        <LandingSection eyebrow="Estimate" title="What would this cost you?" containerSize="md">
          <PricingCalculator />
        </LandingSection>

        <LandingSection eyebrow="Billing" title="Questions about pricing." containerSize="md">
          <PricingFaq />
        </LandingSection>
      </main>
      <SiteFooter />
    </>
  );
}

import { PLANS, FOUNDING_PASS_SEATS_TOTAL, formatPriceCents } from '@/config/pricing';
import { countFounderMerchants } from '@/db/repos/merchants';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { PricingCard } from '@/components/pricing-card';
import { QuickDemoForm } from './quick-demo-form';

// Section 8.1: marketing homepage. Server Component — the only client
// island is the quick-demo form itself (it needs to POST and show state).
export default async function Home() {
  const founderCount = await countFounderMerchants();
  const seatsRemaining = Math.max(FOUNDING_PASS_SEATS_TOTAL - founderCount, 0);

  return (
    <main className="flex-1 bg-background">
      <Container size="md" className="flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="max-w-2xl text-2xl font-medium text-foreground sm:text-3xl">
          Send a link. They see it on themselves.
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Paste a product link, send it anywhere, and your customer sees themselves wearing it in
          about 10 seconds.
        </p>
        <QuickDemoForm />
      </Container>

      <Section title="How it works" className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Paste',
              body: 'Paste any product link — no theme install, no code.',
            },
            {
              step: '2',
              title: 'Send',
              body: 'Share the link anywhere: DM, story, WhatsApp, email.',
            },
            {
              step: '3',
              title: 'They try it on',
              body: 'They take a selfie and see themselves wearing it.',
            },
          ].map((s) => (
            <div key={s.step} className="space-y-2 rounded-md border border-border bg-card p-4">
              <div className="text-xs font-medium text-muted-foreground">Step {s.step}</div>
              <div className="text-sm font-medium text-foreground">{s.title}</div>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pricing" className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PricingCard
            name={PLANS.free.name}
            price={formatPriceCents(PLANS.free.priceCents)}
            features={['20 renders to start, 10/month after', 'Watermarked renders']}
            cta={{ label: 'Start free', href: '/login' }}
          />
          <PricingCard
            name={PLANS.founder.name}
            price={formatPriceCents(PLANS.founder.priceCents)}
            period="once"
            features={['1,000 credits, never expire', 'No watermark']}
            cta={{ label: 'Buy founding pass', href: '/login' }}
            highlight
            note={`${seatsRemaining} of ${FOUNDING_PASS_SEATS_TOTAL} seats left`}
          />
          <PricingCard
            name={PLANS.starter.name}
            price={formatPriceCents(PLANS.starter.priceCents)}
            period="month"
            features={['300 credits/month', 'No watermark']}
            cta={{ label: 'Start free', href: '/login' }}
          />
          <PricingCard
            name={PLANS.growth.name}
            price={formatPriceCents(PLANS.growth.priceCents)}
            period="month"
            features={['1,200 credits/month', 'No watermark']}
            cta={{ label: 'Start free', href: '/login' }}
          />
        </div>
      </Section>
    </main>
  );
}

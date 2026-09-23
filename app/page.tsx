import { retrieveMerchants } from '@/actions/merchants';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Hero } from './_sections/hero';
import { LogoStrip } from './_sections/logo-strip';
import { HowItWorks } from './_sections/how-it-works';
import { ShareLoop } from './_sections/share-loop';
import { Retargeting } from './_sections/retargeting';
import { BeyondClothing } from './_sections/beyond-clothing';
import { Numbers } from './_sections/numbers';
import { ForWhom } from './_sections/for-whom';
import { PricingTeaser } from './_sections/pricing-teaser';
import { FinalCta } from './_sections/final-cta';
import { Faq } from './_sections/faq';

export default async function Home() {
  const founders = await retrieveMerchants({ plan: 'founder' });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-background">
        <Hero />
        <LogoStrip founderCount={founders.length} />
        <HowItWorks />
        <ShareLoop />
        <Retargeting />
        <BeyondClothing />
        <Numbers />
        <ForWhom />
        <PricingTeaser foundersSold={founders.length} />
        <FinalCta />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}

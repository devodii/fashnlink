import { Marquee } from '@/components/motion/marquee';
import { Container } from '@/components/container';
import { BlurFade } from '@/components/motion/blur-fade';

const PLATFORMS = ['Shopify', 'WooCommerce', 'Squarespace', 'Wix', 'Lemon Squeezy', 'Gumroad'];

// `founderCount` is threaded through so this swaps to real founder wordmarks
// (with written permission) once 3 are live; there's no logo asset for that
// yet, so today it always renders the platform-only row regardless of count.
export function LogoStrip({ founderCount: _founderCount }: { founderCount: number }) {
  return (
    <section id="platforms" className="py-12">
      <Container size="lg" className="flex flex-col gap-6">
        <BlurFade>
          <p className="text-center text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Trusted by founders on
          </p>
        </BlurFade>
        <Marquee durationSeconds={30} fade>
          {PLATFORMS.map((name) => (
            <span
              key={name}
              className="px-6 text-lg whitespace-nowrap text-muted-foreground"
              translate="no"
            >
              {name}
            </span>
          ))}
        </Marquee>
      </Container>
    </section>
  );
}

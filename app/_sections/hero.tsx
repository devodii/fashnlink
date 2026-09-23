import { Container } from '@/components/container';
import { BlurFade } from '@/components/motion/blur-fade';
import { WordRotate } from '@/components/motion/word-rotate';
import { HeroDemo } from '@/components/hero-demo';
import { HeroVisual } from './hero-visual';

const ROTATE_WORDS = ['themselves.', 'their friends.', 'your next email.'];

export function Hero() {
  return (
    <section className="flex min-h-[88svh] items-center py-16 md:min-h-[80vh] md:py-20">
      <Container size="lg" className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <BlurFade className="flex flex-col gap-6">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              For brands that sell online
            </p>
            <h1 className="font-display text-5xl leading-[0.95] tracking-[-0.02em] text-foreground md:text-7xl">
              Your customers, wearing what you sell.
              <br />
              <span className="hidden md:inline">
                On <WordRotate words={ROTATE_WORDS} />
              </span>
              <span className="md:hidden">On themselves.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Paste a product link. Send it in a DM, a story, an email. They take a selfie and see
              it on themselves in about ten seconds. Every try-on is a lead you can retarget with
              that exact image.
            </p>
          </BlurFade>

          <BlurFade delay={0.1}>
            <HeroDemo />
          </BlurFade>
        </div>

        <div className="lg:col-span-5">
          <BlurFade delay={0.15}>
            <HeroVisual />
          </BlurFade>
        </div>
      </Container>
    </section>
  );
}

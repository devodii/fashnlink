import { Container } from '@/components/container';
import { BlurFade } from '@/components/motion/blur-fade';
import { HeroDemo } from '@/components/hero-demo';

export function FinalCta() {
  return (
    <section className="py-20 md:py-28">
      <Container size="md" className="flex flex-col items-center gap-8 text-center">
        <BlurFade className="flex flex-col items-center gap-8">
          <h2 className="font-display text-3xl leading-[1.05] tracking-[-0.02em] text-foreground md:text-5xl">
            Send your first link today.
          </h2>
          <div className="w-full max-w-lg">
            <HeroDemo />
          </div>
          <p className="text-sm text-muted-foreground">No card. No install. Delete anytime.</p>
        </BlurFade>
      </Container>
    </section>
  );
}

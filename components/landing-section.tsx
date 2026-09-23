import * as React from 'react';
import { cn } from 'cn';
import { BlurFade } from '@/components/motion/blur-fade';
import { Container } from '@/components/container';

export interface LandingSectionProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  containerSize?: 'md' | 'lg';
}

export function LandingSection({
  eyebrow,
  title,
  description,
  align = 'center',
  containerSize = 'lg',
  className,
  children,
  ...props
}: LandingSectionProps) {
  return (
    <section className={cn('py-20 md:py-28', className)} {...props}>
      <Container size={containerSize} className="flex flex-col gap-10">
        {(eyebrow || title || description) && (
          <BlurFade
            className={cn(
              'flex flex-col gap-3',
              align === 'center' ? 'items-center text-center' : 'items-start text-left',
            )}
          >
            {eyebrow && (
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display text-3xl leading-[1.05] font-normal tracking-[-0.02em] text-foreground md:text-5xl">
                {title}
              </h2>
            )}
            {description && (
              <p
                className={cn(
                  'text-muted-foreground',
                  align === 'center' ? 'max-w-2xl text-lg' : 'max-w-xl text-lg',
                )}
              >
                {description}
              </p>
            )}
          </BlurFade>
        )}
        {children}
      </Container>
    </section>
  );
}

'use client';

import * as React from 'react';
import { LandingSection } from '@/components/landing-section';
import { MediaTile } from '@/components/media-tile';
import { Presence } from '@/components/motion/presence';
import { motion, useReducedMotion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from 'cn';
import { DEMO_PRODUCT, DEMO_RENDER_URL } from '@/lib/demo-assets';

interface Category {
  value: string;
  label: string;
  disabled: boolean;
  product?: string;
  render?: string;
}

const CATEGORIES: Category[] = [
  {
    value: 'clothing',
    label: 'Clothing',
    disabled: false,
    product: DEMO_PRODUCT.imageUrl,
    render: DEMO_RENDER_URL,
  },
  { value: 'shoes', label: 'Shoes', disabled: true },
  { value: 'eyewear', label: 'Eyewear', disabled: true },
  { value: 'jewelry', label: 'Jewelry', disabled: true },
  { value: 'bags', label: 'Bags', disabled: true },
  { value: 'hats', label: 'Hats', disabled: true },
];

export function BeyondClothing() {
  const [value, setValue] = React.useState<string>('clothing');
  const reduceMotion = useReducedMotion();
  const active = CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0];

  return (
    <LandingSection eyebrow="Anything worn" title="Starts with clothes. Doesn't stop there.">
      <div className="flex flex-col items-center gap-8">
        <div
          className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-muted/60 p-1"
          role="radiogroup"
        >
          {CATEGORIES.map((category) => {
            const isActive = category.value === value;
            const button = (
              <button
                key={category.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={category.disabled}
                onClick={() => !category.disabled && setValue(category.value)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {category.label}
              </button>
            );

            if (!category.disabled) return button;

            return (
              <Tooltip key={category.value}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-4">
          <Presence mode="wait">
            {active.product && active.render && (
              <motion.div
                key={active.value}
                initial={reduceMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="col-span-2 grid grid-cols-2 gap-4"
              >
                <MediaTile src={active.product} alt={`${active.label} product`} aspect="3/4" />
                <MediaTile src={active.render} alt={`${active.label} on a shopper`} aspect="3/4" />
              </motion.div>
            )}
          </Presence>
        </div>

        <p className="text-sm text-muted-foreground">
          If a person can wear it, a customer can see it on themselves.
        </p>
      </div>
    </LandingSection>
  );
}

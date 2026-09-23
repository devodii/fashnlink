'use client';

import * as React from 'react';
import { LandingSection } from '@/components/landing-section';
import { MediaTile } from '@/components/media-tile';
import { SegmentedControl } from '@/components/segmented-control';
import { Presence } from '@/components/motion/presence';
import { motion, useReducedMotion } from 'framer-motion';
import { DEMO_PRODUCT, DEMO_RENDER_URL } from '@/lib/demo-assets';

interface Category {
  value: string;
  label: string;
  product?: string;
  render?: string;
}

const CATEGORIES: Category[] = [
  { value: 'clothing', label: 'Clothing', product: DEMO_PRODUCT.imageUrl, render: DEMO_RENDER_URL },
  { value: 'shoes', label: 'Shoes' },
  { value: 'eyewear', label: 'Eyewear' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'bags', label: 'Bags' },
  { value: 'hats', label: 'Hats' },
];

export function BeyondClothing() {
  const [value, setValue] = React.useState('clothing');
  const reduceMotion = useReducedMotion();
  const active = CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0];

  return (
    <LandingSection eyebrow="Anything worn" title="Starts with clothes. Doesn't stop there.">
      <div className="flex flex-col items-center gap-8">
        <div className="max-w-full overflow-x-auto px-4">
          <SegmentedControl options={CATEGORIES} value={value} onChange={setValue} />
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-4">
          <Presence mode="wait">
            <motion.div
              key={active.value}
              initial={reduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="col-span-2 grid grid-cols-2 gap-4"
            >
              <MediaTile
                src={active.product ?? ''}
                alt={active.product ? `${active.label} product` : 'Sample coming soon'}
                aspect="3/4"
                loading={!active.product}
                cropWatermark={!!active.render}
              />
              <MediaTile
                src={active.render ?? ''}
                alt={active.render ? `${active.label} on a shopper` : 'Sample coming soon'}
                aspect="3/4"
                loading={!active.render}
                cropWatermark={!!active.render}
              />
            </motion.div>
          </Presence>
        </div>
      </div>
    </LandingSection>
  );
}

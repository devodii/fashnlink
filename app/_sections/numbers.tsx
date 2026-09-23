'use client';

import { LandingSection } from '@/components/landing-section';
import { StatCard } from '@/components/stat-card';

const STATS = [
  { label: 'per try-on', value: 10, formatter: (v: number) => `~${v} s` },
  { label: 'link works on any store', value: 1, formatter: (v: number) => `${v}` },
  { label: 'code to install', value: 0, formatter: (v: number) => `${v}` },
];

export function Numbers() {
  return (
    <LandingSection eyebrow="How it works" title="No conversion claims. Just the mechanism.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            formatter={stat.formatter}
            className="items-center text-center"
          />
        ))}
      </div>
    </LandingSection>
  );
}

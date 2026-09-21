import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon } from '@phosphor-icons/react/ssr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  features: string[];
  cta: { label: string; onClick?: () => void; href?: string };
  highlight?: boolean;
  note?: string;
  className?: string;
}

export function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  highlight,
  note,
  className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-md border p-6',
        highlight ? 'border-ring bg-secondary' : 'border-border bg-card',
        className,
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{name}</p>
          {highlight && <Badge>Popular</Badge>}
        </div>
        <p className="text-2xl font-medium text-foreground" translate="no">
          {price}
          {period && <span className="text-sm font-normal text-muted-foreground"> /{period}</span>}
        </p>
      </div>
      <ul className="flex-1 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
            {feature}
          </li>
        ))}
      </ul>
      {cta.href ? (
        <Button asChild variant={highlight ? 'default' : 'outline'}>
          <a href={cta.href}>{cta.label}</a>
        </Button>
      ) : (
        <Button variant={highlight ? 'default' : 'outline'} onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

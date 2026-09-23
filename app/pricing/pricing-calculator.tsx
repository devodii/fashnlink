'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { NumberTicker } from '@/components/motion/number-ticker';
import { PLANS } from '@/constants';

// Blended per-try-on price at growth volume; used only to give the
// estimate a concrete dollar figure, not a real per-merchant quote.
const BLENDED_CENTS_PER_TRYON = PLANS.growth.overageCentsPerRender ?? 12;

export function PricingCalculator() {
  const [tryons, setTryons] = React.useState(500);
  const [captureRate, setCaptureRate] = React.useState(35);

  const leads = Math.round(tryons * (captureRate / 100));
  const monthlyCostCents = tryons * BLENDED_CENTS_PER_TRYON;
  const costPerLeadCents = leads > 0 ? Math.round(monthlyCostCents / leads) : 0;

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="tryons-slider" className="text-sm font-medium text-foreground">
            Expected try-ons per month
          </label>
          <span className="text-sm text-muted-foreground" translate="no">
            {tryons.toLocaleString()}
          </span>
        </div>
        <Slider
          id="tryons-slider"
          value={[tryons]}
          onValueChange={([value]) => setTryons(value)}
          min={50}
          max={5000}
          step={50}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="capture-rate" className="text-sm font-medium text-foreground">
          Your email capture rate
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="capture-rate"
            type="number"
            min={1}
            max={100}
            value={captureRate}
            onChange={(e) => setCaptureRate(Math.min(100, Math.max(1, Number(e.target.value))))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Estimated leads / month</p>
          <p className="text-xl font-medium text-foreground">
            <NumberTicker value={leads} />
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Estimated cost per lead</p>
          <p className="text-xl font-medium text-foreground" translate="no">
            $
            <NumberTicker value={costPerLeadCents} formatter={(v) => (v / 100).toFixed(2)} />
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        An estimate from your inputs above, not a quote. Actual cost depends on your plan and real
        capture rate.
      </p>
    </Card>
  );
}

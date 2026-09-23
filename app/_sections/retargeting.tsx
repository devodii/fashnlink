import { EnvelopeIcon, SparkleIcon, ShieldCheckIcon } from '@phosphor-icons/react/ssr';
import { LandingSection } from '@/components/landing-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MediaTile } from '@/components/media-tile';
import { InlineAlert } from '@/components/inline-alert';
import { RetargetingBeam } from './retargeting-beam';
import { DEMO_RENDER_URL } from '@/lib/demo-assets';

const BLOCKS = [
  {
    icon: EnvelopeIcon,
    title: 'Abandoned try-on',
    description:
      "They tried it on and didn't buy. Your flow sends a photo of them in it, with one button to checkout. Reuses the render, costs nothing extra.",
  },
  {
    icon: SparkleIcon,
    title: 'New drop',
    description:
      'Launch a collection and every subscriber sees themselves in it. Pick up to three products; we render and push the event to your ESP.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Consent first',
    description:
      'Only for shoppers who opted in. One-tap opt-out on their side. Images expire after 30 days.',
  },
];

export function Retargeting() {
  return (
    <LandingSection
      id="retargeting"
      eyebrow="A new kind of email"
      title="The email they can't ignore."
      description="Your Klaviyo or Mailchimp flows can now show each customer wearing the exact item they left behind, or your whole new drop. Not a product photo. Them."
      align="left"
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-8">
          {BLOCKS.map((block) => (
            <div key={block.title} className="flex gap-4">
              <block.icon className="mt-1 size-5 shrink-0 text-foreground" weight="light" />
              <div className="flex flex-col gap-1">
                <p className="text-base font-medium text-foreground">{block.title}</p>
                <p className="text-muted-foreground">{block.description}</p>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Badge variant="outline">Klaviyo</Badge>
              <Badge variant="outline">Mailchimp</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Plugs into the flows you already run. No new sending platform.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <RetargetingBeam />

          <Card className="mx-auto w-full max-w-90 gap-0 overflow-hidden p-0">
            <div className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
              This looked good on you.
            </div>
            <MediaTile
              src={DEMO_RENDER_URL}
              alt="You wearing the item"
              aspect="4/5"
              className="rounded-none"
            />
            <div className="flex flex-col gap-3 p-4">
              <Button className="w-full">Complete your order</Button>
              <p className="text-xs text-muted-foreground">
                You&apos;re receiving this because you tried this on.
              </p>
            </div>
          </Card>

          <InlineAlert tone="neutral" className="lg:hidden">
            Included on Founder and paid plans.
          </InlineAlert>
        </div>
      </div>
    </LandingSection>
  );
}

import { LandingSection } from '@/components/landing-section';
import { BentoCard } from '@/components/bento-grid';
import { AnimatedList } from '@/components/motion/animated-list';
import { AvatarStack } from '@/components/avatar-stack';
import { MediaTile } from '@/components/media-tile';
import { DEMO_RENDER_URL, DEMO_TWIN } from '@/lib/demo-assets';

const NOTIFICATIONS = ['Ada shared her look', 'Tobi tried it on', 'Zainab shared her look'];

const GROUP_MEMBERS = ['Ada', 'Tobi', 'Zainab', 'Chidi', 'Amara', 'Femi'].map((name) => ({
  alt: name,
}));

export function ShareLoop() {
  return (
    <LandingSection eyebrow="For the merchant" title="Every try-on works for you.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BentoCard>
          <p className="text-sm font-medium text-foreground">One render, more reach</p>
          <p className="text-sm text-muted-foreground">
            Every shopper who tries something on can forward that exact photo. Free reach you
            didn&apos;t pay for.
          </p>
          <AnimatedList
            items={NOTIFICATIONS.map((text) => (
              <div
                key={text}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {text}
              </div>
            ))}
            maxVisible={3}
          />
        </BentoCard>

        <BentoCard>
          <p className="text-sm font-medium text-foreground">Group links</p>
          <p className="text-sm text-muted-foreground">
            Send one link to a group chat. Everyone in it tries the item on, on their own photo.
          </p>
          <div className="flex items-center gap-3">
            <AvatarStack items={GROUP_MEMBERS} max={6} />
            <span className="text-xs text-muted-foreground">6 people, 1 link</span>
          </div>
        </BentoCard>

        <BentoCard>
          <p className="text-sm font-medium text-foreground">Every render becomes a lead</p>
          <p className="text-sm text-muted-foreground">
            Saved to this shopper&apos;s profile, ready for the retargeting email above.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MediaTile src={DEMO_TWIN.twinUrl} alt="Twin selfie" aspect="1/1" />
            <MediaTile src={DEMO_RENDER_URL} alt="Plaid shirt render" aspect="1/1" cropWatermark />
          </div>
        </BentoCard>
      </div>
    </LandingSection>
  );
}

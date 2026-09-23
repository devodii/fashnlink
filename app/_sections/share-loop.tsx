import { LandingSection } from '@/components/landing-section';
import { BentoCard } from '@/components/bento-grid';
import { AnimatedList } from '@/components/motion/animated-list';
import { AvatarStack } from '@/components/avatar-stack';
import { MediaTile } from '@/components/media-tile';
import { DEMO_RENDER_URL, DEMO_TWIN } from '@/lib/demo-assets';

const NOTIFICATIONS = ['Ada sent you a look', 'Tobi tried it on', 'Zainab sent you a look'];

const GROUP_AVATARS = Array.from({ length: 6 }, (_, i) => ({
  alt: `Member ${i + 1}`,
}));

export function ShareLoop() {
  return (
    <LandingSection eyebrow="For the merchant" title="Every try-on works for you.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BentoCard>
          <p className="text-sm font-medium text-foreground">Sent to friends</p>
          <p className="text-sm text-muted-foreground">
            More people see the render than tried it on.
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
            One link, everyone in the group tries it on.
          </p>
          <AvatarStack items={GROUP_AVATARS} max={6} />
        </BentoCard>

        <BentoCard>
          <p className="text-sm font-medium text-foreground">Every render, saved</p>
          <p className="text-sm text-muted-foreground">A history you can retarget later.</p>
          <div className="grid grid-cols-2 gap-3">
            <MediaTile src={DEMO_TWIN.twinUrl} alt="Twin selfie" aspect="1/1" />
            <MediaTile src={DEMO_RENDER_URL} alt="Plaid shirt render" aspect="1/1" cropWatermark />
          </div>
        </BentoCard>
      </div>
    </LandingSection>
  );
}

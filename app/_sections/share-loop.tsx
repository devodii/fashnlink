'use client';

import * as React from 'react';
import { LandingSection } from '@/components/landing-section';
import { BentoGrid, BentoCard } from '@/components/bento-grid';
import { AnimatedList } from '@/components/motion/animated-list';
import { PollOptions } from '@/components/poll-options';
import { AvatarStack } from '@/components/avatar-stack';
import { MediaTile } from '@/components/media-tile';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { DEMO_PRODUCT, DEMO_TWIN, DEMO_TWIN_SECOND_PRODUCT } from '@/lib/demo-assets';

const NOTIFICATIONS = [
  'Ada sent you a look',
  'Which one? Vote',
  'Tobi tried it on',
  'Zainab sent you a look',
];

const GROUP_AVATARS = Array.from({ length: 6 }, (_, i) => ({
  alt: `Member ${i + 1}`,
}));

export function ShareLoop() {
  return (
    <LandingSection eyebrow="Built to travel" title="One try-on becomes three.">
      <BentoGrid>
        <BentoCard colSpan={2}>
          <p className="text-sm font-medium text-foreground">Send to a friend</p>
          <p className="text-sm text-muted-foreground">
            They can forward the exact render, not just the product link.
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
            maxVisible={4}
          />
        </BentoCard>

        <BentoCard rowSpan={2}>
          <p className="text-sm font-medium text-foreground">Which one?</p>
          <p className="text-sm text-muted-foreground">Friends vote on the look that wins.</p>
          <PollOptions
            options={[
              { id: 'a', image: DEMO_PRODUCT.imageUrl, label: 'Shorts', votes: 7 },
              { id: 'b', image: DEMO_TWIN_SECOND_PRODUCT.imageUrl, label: 'Sneakers', votes: 3 },
            ]}
            value="a"
            onVote={() => {}}
            results
          />
        </BentoCard>

        <BentoCard>
          <p className="text-sm font-medium text-foreground">Group links</p>
          <p className="text-sm text-muted-foreground">
            One link, everyone in the group tries it on.
          </p>
          <Stagger className="flex">
            <StaggerItem>
              <AvatarStack items={GROUP_AVATARS} max={6} />
            </StaggerItem>
          </Stagger>
        </BentoCard>

        <BentoCard>
          <p className="text-sm font-medium text-foreground">Their closet</p>
          <p className="text-sm text-muted-foreground">Every render, the same person, saved.</p>
          <div className="grid grid-cols-2 gap-3">
            <MediaTile src={DEMO_TWIN.twinUrl} alt="Twin selfie" aspect="1/1" />
            <MediaTile
              src={DEMO_TWIN_SECOND_PRODUCT.renderUrl}
              alt="Sneakers render"
              aspect="1/1"
            />
            <MediaTile src="" alt="More renders coming" aspect="1/1" loading />
            <MediaTile src="" alt="More renders coming" aspect="1/1" loading />
          </div>
        </BentoCard>
      </BentoGrid>
    </LandingSection>
  );
}

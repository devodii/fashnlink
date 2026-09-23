import { LandingSection } from '@/components/landing-section';
import { BlurFade } from '@/components/motion/blur-fade';

const AUDIENCES = [
  {
    title: 'Brands that sell in DMs',
    description: 'Instagram, WhatsApp, story replies. Send the link where the conversation is.',
  },
  {
    title: 'Brands on Klaviyo or Mailchimp',
    description: "Turn try-ons into the most personal flow you've ever sent.",
  },
  {
    title: 'Anyone tired of "will this look good on me?"',
    description: 'Answer it before they ask.',
  },
];

export function ForWhom() {
  return (
    <LandingSection eyebrow="Who it's for">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        {AUDIENCES.map((audience, i) => (
          <BlurFade key={audience.title} delay={i * 0.06} className="flex flex-col gap-2">
            <p className="text-lg font-medium text-foreground">{audience.title}</p>
            <p className="text-muted-foreground">{audience.description}</p>
          </BlurFade>
        ))}
      </div>
    </LandingSection>
  );
}

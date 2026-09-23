import { LandingSection } from '@/components/landing-section';
import { Timeline } from '@/components/timeline';
import {
  LinkPasteMedia,
  ChatPreviewMedia,
  TryOnRevealMedia,
  LeadsTableMedia,
} from './how-it-works-media';

const STEPS = [
  {
    label: 'Paste a link',
    title: 'Paste a link',
    description:
      'Any product page, no theme edits, no code. We read the product, its images and its variants.',
    media: <LinkPasteMedia />,
  },
  {
    label: 'Send it anywhere',
    title: 'Send it anywhere',
    description:
      'Drop it in a DM, a story, WhatsApp, or your next email. It works wherever your customers already talk to you.',
    media: <ChatPreviewMedia />,
  },
  {
    label: 'They see it on themselves',
    title: 'They see it on themselves',
    description: 'One selfie. About ten seconds. A share button that brings their friends.',
    media: <TryOnRevealMedia />,
  },
  {
    label: 'You keep the lead',
    title: 'You keep the lead',
    description:
      'Every try-on captures an email. You now know who wanted what, and what it looked like on them.',
    media: <LeadsTableMedia />,
  },
];

export function HowItWorks() {
  return (
    <LandingSection id="how-it-works" eyebrow="Three steps" title="From link to lead in a minute.">
      <Timeline steps={STEPS} animated />
    </LandingSection>
  );
}

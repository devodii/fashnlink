import { LandingSection } from '@/components/landing-section';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ITEMS = [
  {
    question: 'Does it work on my store?',
    answer:
      'If shoppers can browse products on a page, we can usually read it. Shopify, WooCommerce, Squarespace and Wix work out of the box; most other product pages work too.',
  },
  {
    question: 'What happens to customer photos?',
    answer:
      "Selfies are used to build the try-on and are deleted on request. We don't sell or share them.",
  },
  {
    question: 'Do I need Klaviyo?',
    answer:
      'No. The link and try-on work on their own. Klaviyo or Mailchimp only matters if you want retargeting emails.',
  },
  {
    question: 'How accurate is it?',
    answer:
      "It's an AI preview of how the item looks on that person, not a fit guarantee. Sizing and true fit still depend on the garment.",
  },
  {
    question: 'What counts as a try-on?',
    answer: 'One completed render: a shopper submits a selfie and we successfully generate it.',
  },
  {
    question: 'Can I put a button on my product page?',
    answer: 'Yes, optionally. That comes later; for now, links work anywhere you paste them.',
  },
];

export function Faq() {
  return (
    <LandingSection eyebrow="Questions" title="Before you ask." containerSize="md">
      <Accordion type="single" collapsible className="w-full">
        {ITEMS.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </LandingSection>
  );
}

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ITEMS = [
  {
    question: 'What happens if a try-on fails?',
    answer: "It's refunded automatically. You're never charged a credit for a failed render.",
  },
  {
    question: 'Do retargeting emails cost extra?',
    answer: 'No. They reuse the render you already paid for and cost nothing additional.',
  },
  {
    question: 'What happens when the founder seats sell out?',
    answer:
      'The founder price is locked forever for the people who bought in. New merchants move to Starter or Growth once subscriptions ship.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Yes, once monthly plans ship you can move between Starter and Growth at any time.',
  },
  {
    question: 'Do unused free try-ons roll over?',
    answer:
      "The starting 20 don't expire until used; the monthly 10 reset each month and don't stack.",
  },
];

export function PricingFaq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {ITEMS.map((item) => (
        <AccordionItem key={item.question} value={item.question}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

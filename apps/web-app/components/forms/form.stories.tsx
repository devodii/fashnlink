import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { LoadingButton } from '@/components/loading-button';
import { Form } from './form';
import { TextField } from './text-field';
import { EmailField } from './email-field';
import { UrlField } from './url-field';
import { NumberField } from './number-field';
import { SelectField } from './select-field';
import { MultiSelectField } from './multi-select-field';
import { TextareaField } from './textarea-field';
import { RadioGroupField } from './radio-group-field';
import { SwatchField } from './swatch-field';
import { SegmentedField } from './segmented-field';
import { TagField } from './tag-field';
import { DateField } from './date-field';
import { CheckboxField } from './checkbox-field';
import { SwitchField } from './switch-field';

const BRAND_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), token: `brand-${n}` }));

const schema = z.object({
  title: z.string().min(1, 'Required'),
  email: z.string().email(),
  url: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().optional(),
  category: z.string().min(1, 'Required'),
  tags: z.array(z.string()).default([]),
  consent: z.boolean().refine((v) => v, 'Required'),
  notify: z.boolean().default(false),
  size: z.string().min(1, 'Required'),
  accent: z.string().min(1, 'Required'),
  channel: z.string().min(1, 'Required'),
  labels: z.array(z.string()).default([]),
  releaseDate: z.string().optional().default(''),
});

function FullFormDemo() {
  const form = useZodForm(schema, {
    defaultValues: {
      title: '',
      email: '',
      url: '',
      description: '',
      price: undefined,
      category: '',
      tags: [],
      consent: false,
      notify: false,
      size: '',
      accent: '',
      channel: 'whatsapp',
      labels: [],
      releaseDate: '',
    },
  });

  return (
    <Form
      form={form}
      onSubmit={async () => {
        await new Promise((r) => setTimeout(r, 400));
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <TextField control={form.control} name="title" label="Title" placeholder="Linen shirt" />
      <EmailField control={form.control} name="email" label="Email" />
      <UrlField
        control={form.control}
        name="url"
        label="Product URL"
        placeholder="yourshop.com/products/linen-shirt"
      />
      <NumberField control={form.control} name="price" label="Price" placeholder="48" />
      <SelectField
        control={form.control}
        name="category"
        label="Category"
        options={[
          { value: 'top', label: 'Top' },
          { value: 'bottom', label: 'Bottom' },
          { value: 'shoes', label: 'Shoes' },
        ]}
      />
      <MultiSelectField
        control={form.control}
        name="tags"
        label="Tags"
        options={[
          { value: 'new', label: 'New' },
          { value: 'sale', label: 'Sale' },
          { value: 'bestseller', label: 'Bestseller' },
        ]}
      />
      <TextareaField
        control={form.control}
        name="description"
        label="Description"
        className="md:col-span-2"
      />
      <RadioGroupField
        control={form.control}
        name="size"
        label="Size"
        options={[
          { value: 's', label: 'S' },
          { value: 'm', label: 'M' },
          { value: 'l', label: 'L' },
        ]}
      />
      <SwatchField control={form.control} name="accent" label="Accent" options={BRAND_OPTIONS} />
      <SegmentedField
        control={form.control}
        name="channel"
        label="Contact channel"
        options={[
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'email', label: 'Email' },
        ]}
      />
      <TagField control={form.control} name="labels" label="Labels" placeholder="Add a label…" />
      <DateField control={form.control} name="releaseDate" label="Release date" />
      <CheckboxField
        control={form.control}
        name="consent"
        label="I am 18 or older and this is a photo of me"
        className="md:col-span-2"
      />
      <SwitchField
        control={form.control}
        name="notify"
        label="Send me looks"
        description="Unsubscribe anytime."
        className="md:col-span-2"
      />
      <LoadingButton type="submit" loading={form.formState.isSubmitting} className="md:col-span-2">
        Save
      </LoadingButton>
    </Form>
  );
}

const meta: Meta<typeof FullFormDemo> = {
  component: FullFormDemo,
  title: 'components/forms/Form',
  tags: ['ai-generated'],
};
export default meta;

type Story = StoryObj<typeof FullFormDemo>;

export const AllFields: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

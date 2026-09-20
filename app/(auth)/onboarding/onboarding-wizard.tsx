'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { StepWizard } from '@/components/step-wizard';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { UrlField } from '@/components/forms/url-field';
import { TextField } from '@/components/forms/text-field';
import { PhoneField } from '@/components/forms/phone-field';
import { SegmentedField } from '@/components/forms/segmented-field';
import { SwatchField } from '@/components/forms/swatch-field';
import { LoadingButton } from '@/components/loading-button';
import { InlineAlert } from '@/components/inline-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadDropzone, type UploadedFile } from '@/components/upload-dropzone';
import { MediaTile } from '@/components/media-tile';
import { CopyField } from '@/components/copy-field';
import { PhoneFrame } from '@/components/phone-frame';
import { ChipSelect } from '@/components/chip-select';

const PLATFORM_CHIPS = ['Shopify', 'WooCommerce', 'Squarespace', 'Wix', 'Something else'].map(
  (label) => ({ value: label, label }),
);

const urlSchema = z.object({ url: z.string().url('Paste a full product URL') });
const brandSchema = z.object({
  name: z.string().min(1, 'Required'),
  accentToken: z.enum(['1', '2', '3', '4', '5', '6']),
  contactType: z.enum(['whatsapp', 'instagram', 'email']),
  contactValue: z.string().min(1, 'Required'),
});

type CreatedLink = { linkId: string; slug: string; productId: string; productTitle: string };

export function OnboardingWizard({ appUrl }: { appUrl: string }) {
  const router = useRouter();
  const [created, setCreated] = React.useState<CreatedLink | null>(null);
  const [logo, setLogo] = React.useState<UploadedFile | null>(null);

  return (
    <StepWizard
      steps={[
        {
          id: 'product',
          title: 'Show us something you sell',
          render: (api) => (
            <ProductStep
              onCreated={(link) => {
                setCreated(link);
                api.next();
              }}
            />
          ),
        },
        {
          id: 'brand',
          title: 'How shoppers reach you',
          render: (api) => <BrandStep logo={logo} onLogo={setLogo} onDone={() => api.next()} />,
        },
        {
          id: 'link',
          title: 'Your first link',
          render: () => (
            <LinkStep appUrl={appUrl} created={created} onDone={() => router.push('/dashboard')} />
          ),
        },
      ]}
    />
  );
}

function ProductStep({ onCreated }: { onCreated: (link: CreatedLink) => void }) {
  const form = useZodForm(urlSchema, { defaultValues: { url: '' } });
  const [preview, setPreview] = React.useState<CreatedLink | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [somethingElse, setSomethingElse] = React.useState(false);
  const [selectedChip, setSelectedChip] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');

  async function onSubmit(values: z.infer<typeof urlSchema>) {
    setError(null);
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "We couldn't read that page.");
      return;
    }
    setPreview(json);
  }

  async function sendFreeText() {
    await fetch('/api/platform-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSomethingElse(false);
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Looks like we found this product:</p>
        <div className="rounded-md border border-border p-4">
          <p className="font-medium text-foreground">{preview.productTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(null)}>
            That&apos;s not right
          </Button>
          <Button onClick={() => onCreated(preview)}>That&apos;s right</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Form form={form} onSubmit={onSubmit} className="space-y-4">
        <UrlField
          control={form.control}
          name="url"
          label="Paste a link to any product you sell"
          placeholder="https://yourshop.com/products/linen-shirt"
          description="A product page, an Instagram post, or a checkout link all work."
        />
        <LoadingButton type="submit" loading={form.formState.isSubmitting} className="w-full">
          Continue
        </LoadingButton>
      </Form>
      {error && (
        <InlineAlert tone="destructive">
          {error} You can still add products by uploading photos, head to the dashboard when
          you&apos;re ready, or tell us what you use below.
        </InlineAlert>
      )}

      <ChipSelect
        options={PLATFORM_CHIPS}
        value={selectedChip}
        onChange={(value) => {
          setSelectedChip(value);
          if (value === 'Something else') setSomethingElse(true);
        }}
      />

      {somethingElse && (
        <div className="space-y-2">
          <Label htmlFor="platform-notes">What do you use to sell?</Label>
          <Input
            id="platform-notes"
            placeholder="e.g. a custom cart, Etsy, ..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button size="sm" onClick={sendFreeText}>
            Send
          </Button>
        </div>
      )}
    </div>
  );
}

function BrandStep({
  logo,
  onLogo,
  onDone,
}: {
  logo: UploadedFile | null;
  onLogo: (file: UploadedFile | null) => void;
  onDone: () => void;
}) {
  const form = useZodForm<z.infer<typeof brandSchema>>(brandSchema, {
    defaultValues: { name: '', accentToken: '1', contactType: 'whatsapp', contactValue: '' },
  });
  const contactType = form.watch('contactType');

  async function onSubmit(values: z.infer<typeof brandSchema>) {
    await fetch('/api/merchants/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        accentToken: values.accentToken,
        ...(logo && { logoUrl: logo.url }),
        contactChannel: { type: values.contactType, value: values.contactValue },
      }),
    });
    onDone();
  }

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4">
      <TextField control={form.control} name="name" label="Brand name" placeholder="Studio Ada" />

      {logo ? (
        <MediaTile src={logo.url} alt="Logo" aspect="1/1" className="size-48" />
      ) : (
        <UploadDropzone
          accept="image/*"
          aspect="1/1"
          className="w-48"
          onFiles={(files) => onLogo(files[0] ?? null)}
        />
      )}

      <SwatchField
        control={form.control}
        name="accentToken"
        label="Accent color"
        options={[1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), token: `brand-${n}` }))}
      />

      <SegmentedField
        control={form.control}
        name="contactType"
        label="Contact channel"
        options={[
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'email', label: 'Email' },
        ]}
      />
      {contactType === 'whatsapp' ? (
        <PhoneField control={form.control} name="contactValue" label="Contact detail" />
      ) : (
        <TextField
          control={form.control}
          name="contactValue"
          label="Contact detail"
          placeholder={contactType === 'instagram' ? '@yourstore' : 'you@yourstore.com'}
        />
      )}

      <LoadingButton type="submit" loading={form.formState.isSubmitting} className="w-full">
        Continue
      </LoadingButton>
    </Form>
  );
}

function LinkStep({
  appUrl,
  created,
  onDone,
}: {
  appUrl: string;
  created: CreatedLink | null;
  onDone: () => void;
}) {
  if (!created) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add a product from the dashboard to get your first link.
        </p>
        <Button onClick={onDone} className="w-full">
          Go to dashboard
        </Button>
      </div>
    );
  }

  const url = `${appUrl}/t/${created.slug}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Send this to one customer today.</p>
      <CopyField label="Your link" value={url} />
      <PhoneFrame src={`/t/${created.slug}?preview=1`} />
      <Button onClick={onDone} className="w-full">
        Go to dashboard
      </Button>
    </div>
  );
}

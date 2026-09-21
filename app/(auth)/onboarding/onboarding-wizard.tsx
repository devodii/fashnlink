'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { StepWizard, type StepWizardApi } from '@/components/step-wizard';
import { useZodForm } from '@/hooks/use-zod-form';
import { UrlField } from '@/components/forms/url-field';
import { TextField } from '@/components/forms/text-field';
import { PhoneField } from '@/components/forms/phone-field';
import { SegmentedField } from '@/components/forms/segmented-field';
import { SwatchField } from '@/components/forms/swatch-field';
import { InlineAlert } from '@/components/inline-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadDropzone, type UploadedFile } from '@/components/upload-dropzone';
import { MediaTile } from '@/components/media-tile';
import { CopyField } from '@/components/copy-field';
import { PhoneFrame } from '@/components/phone-frame';
import { ChipSelect } from '@/components/chip-select';
import { contactChannelSchema } from '@/constants';

const PLATFORM_CHIPS = ['Shopify', 'WooCommerce', 'Squarespace', 'Wix', 'Something else'].map(
  (label) => ({ value: label, label }),
);

const REFERRAL_CHIPS = [
  'Google Search',
  'Instagram',
  'TikTok',
  'Twitter / X',
  'Friend or colleague',
  'Something else',
].map((label) => ({ value: label, label }));

const urlSchema = z.object({ url: z.string().url('Paste a full product URL') });
const brandSchema = z.object({
  name: z.string().min(1, 'Required'),
  accentToken: z.enum(['1', '2', '3', '4', '5', '6']),
  contactChannel: contactChannelSchema,
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
              api={api}
              onCreated={(link) => {
                setCreated(link);
              }}
            />
          ),
        },
        {
          id: 'brand',
          title: 'How shoppers reach you',
          render: (api) => <BrandStep api={api} logo={logo} onLogo={setLogo} />,
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

function ProductStep({
  api,
  onCreated,
}: {
  api: StepWizardApi;
  onCreated: (link: CreatedLink) => void;
}) {
  const form = useZodForm(urlSchema, { defaultValues: { url: '' } });
  const [preview, setPreview] = React.useState<CreatedLink | null>(null);
  const [error, setErrorState] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState(0);
  const setError = (msg: string | null) => {
    setErrorState(msg);
    if (msg) setErrorKey((k) => k + 1);
  };
  const [selectedChip, setSelectedChip] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');
  const somethingElse = selectedChip === 'Something else';

  React.useEffect(() => {
    api.setOnNext(async () => {
      setError(null);
      const url = form.getValues('url').trim();

      if (url) {
        const valid = await form.trigger('url');
        if (!valid) return false;
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'single', url }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? "We couldn't read that page.");
          return false;
        }
        setPreview(json);
        return false;
      }

      if (somethingElse) {
        if (!notes.trim()) {
          setError('Tell us where you sell so we know what to build next.');
          return false;
        }
        await fetch('/api/platform-requests', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
        return true;
      }

      if (selectedChip) return true;

      setError('Paste a product link, or tell us where you sell below.');
      return false;
    });
    return () => api.setOnNext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somethingElse, selectedChip, notes]);

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
          <Button
            onClick={() => {
              onCreated(preview);
              api.next();
            }}
          >
            That&apos;s right
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <UrlField
        control={form.control}
        name="url"
        label="Paste a link to any product you sell"
        placeholder="https://yourshop.com/products/linen-shirt"
        description="A product page, an Instagram post, or a checkout link all work."
      />
      {error && (
        <InlineAlert tone="destructive" resetKey={errorKey}>
          {error}
        </InlineAlert>
      )}

      <div className="space-y-2">
        <Label>Or tell us what you use to sell</Label>
        <ChipSelect options={PLATFORM_CHIPS} value={selectedChip} onChange={setSelectedChip} />
      </div>

      {somethingElse && (
        <div className="space-y-2">
          <Label htmlFor="platform-notes">Where do you sell?</Label>
          <Input
            id="platform-notes"
            placeholder="yourshop.com"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function BrandStep({
  api,
  logo,
  onLogo,
}: {
  api: StepWizardApi;
  logo: UploadedFile | null;
  onLogo: (file: UploadedFile | null) => void;
}) {
  const form = useZodForm<z.infer<typeof brandSchema>>(brandSchema, {
    defaultValues: {
      name: '',
      accentToken: '1',
      contactChannel: { type: 'whatsapp', value: '' },
    },
  });
  const contactType = form.watch('contactChannel.type');
  const [referral, setReferral] = React.useState<string | null>(null);
  const [referralOther, setReferralOther] = React.useState('');
  const [referralError, setReferralError] = React.useState<string | null>(null);
  const [referralErrorKey, setReferralErrorKey] = React.useState(0);
  const referralIsOther = referral === 'Something else';

  React.useEffect(() => {
    api.setOnNext(async () => {
      setReferralError(null);
      if (!referral) {
        setReferralError('Tell us how you heard about us.');
        setReferralErrorKey((k) => k + 1);
        return false;
      }
      if (referralIsOther && !referralOther.trim()) {
        setReferralError('Tell us where, so we know what to say thanks for.');
        setReferralErrorKey((k) => k + 1);
        return false;
      }

      let success = false;
      await form.handleSubmit(async (values) => {
        await fetch('/api/merchants/me', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            accentToken: values.accentToken,
            ...(logo && { logoUrl: logo.url }),
            contactChannel: values.contactChannel,
            referralSource: referralIsOther ? referralOther.trim() : referral,
          }),
        });
        success = true;
      })();
      return success;
    });
    return () => api.setOnNext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referral, referralOther, logo]);

  return (
    <div className="space-y-4">
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
        name="contactChannel.type"
        label="Contact channel"
        options={[
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'email', label: 'Email' },
        ]}
      />
      {contactType === 'whatsapp' ? (
        <PhoneField control={form.control} name="contactChannel.value" label="Contact detail" />
      ) : (
        <TextField
          control={form.control}
          name="contactChannel.value"
          label="Contact detail"
          placeholder={contactType === 'instagram' ? '@yourstore' : 'you@yourstore.com'}
        />
      )}

      <div className="space-y-2">
        <Label>How did you hear about us?</Label>
        <ChipSelect options={REFERRAL_CHIPS} value={referral} onChange={setReferral} />
      </div>

      {referralIsOther && (
        <div className="space-y-2">
          <Label htmlFor="referral-other">Where?</Label>
          <Input
            id="referral-other"
            placeholder="A podcast, a newsletter, ..."
            value={referralOther}
            onChange={(e) => setReferralOther(e.target.value)}
          />
        </div>
      )}

      {referralError && (
        <InlineAlert tone="destructive" resetKey={referralErrorKey}>
          {referralError}
        </InlineAlert>
      )}
    </div>
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

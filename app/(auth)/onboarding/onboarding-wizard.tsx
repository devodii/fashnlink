'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import * as RHF from 'react-hook-form';
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

/**
 * StepWizard only ever mounts the current step (SlideSwitch/AnimatePresence
 * unmounts the previous one), so every piece of step state lives here at the
 * wizard level and gets passed down, not created inside the step
 * components, or it would reset on every Back/Next.
 */
export function OnboardingWizard({ appUrl }: { appUrl: string }) {
  const router = useRouter();
  const [created, setCreated] = React.useState<CreatedLink | null>(null);
  const [logo, setLogo] = React.useState<UploadedFile | null>(null);

  const productForm = useZodForm(urlSchema, { defaultValues: { url: '' } });
  const [productPreview, setProductPreview] = React.useState<CreatedLink | null>(null);
  const [productChip, setProductChip] = React.useState<string | null>(null);
  const [productNotes, setProductNotes] = React.useState('');

  const brandForm = useZodForm<z.infer<typeof brandSchema>>(brandSchema, {
    defaultValues: {
      name: '',
      accentToken: '1',
      contactChannel: { type: 'whatsapp', value: '' },
    },
  });
  const [referral, setReferral] = React.useState<string | null>(null);
  const [referralOther, setReferralOther] = React.useState('');

  return (
    <StepWizard
      steps={[
        {
          id: 'product',
          title: 'Show us something you sell',
          render: (api) => (
            <ProductStep
              api={api}
              form={productForm}
              preview={productPreview}
              onPreview={setProductPreview}
              selectedChip={productChip}
              onSelectedChip={setProductChip}
              notes={productNotes}
              onNotes={setProductNotes}
              onCreated={setCreated}
            />
          ),
        },
        {
          id: 'brand',
          title: 'How shoppers reach you',
          render: (api) => (
            <BrandStep
              api={api}
              form={brandForm}
              logo={logo}
              onLogo={setLogo}
              referral={referral}
              onReferral={setReferral}
              referralOther={referralOther}
              onReferralOther={setReferralOther}
            />
          ),
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
  form,
  preview,
  onPreview,
  selectedChip,
  onSelectedChip,
  notes,
  onNotes,
  onCreated,
}: {
  api: StepWizardApi;
  form: RHF.UseFormReturn<z.infer<typeof urlSchema>>;
  preview: CreatedLink | null;
  onPreview: (link: CreatedLink | null) => void;
  selectedChip: string | null;
  onSelectedChip: (chip: string | null) => void;
  notes: string;
  onNotes: (notes: string) => void;
  onCreated: (link: CreatedLink) => void;
}) {
  const [error, setErrorState] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState(0);
  const setError = (msg: string | null) => {
    setErrorState(msg);
    if (msg) setErrorKey((k) => k + 1);
  };
  const somethingElse = selectedChip === 'Something else';

  const createLinkMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'single', url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "We couldn't read that page.");
      return json as CreatedLink;
    },
  });

  const platformRequestMutation = useMutation({
    mutationFn: (requestNotes: string) =>
      fetch('/api/platform-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: requestNotes }),
      }),
  });

  React.useEffect(() => {
    api.setOnNext(async () => {
      setError(null);
      const url = form.getValues('url').trim();

      if (url) {
        const valid = await form.trigger('url');
        if (!valid) return false;
        try {
          const json = await createLinkMutation.mutateAsync(url);
          onPreview(json);
        } catch (err) {
          setError(err instanceof Error ? err.message : "We couldn't read that page.");
        }
        return false;
      }

      if (somethingElse) {
        if (!notes.trim()) {
          setError('Tell us where you sell so we know what to build next.');
          return false;
        }
        await platformRequestMutation.mutateAsync(notes);
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
          <Button variant="outline" onClick={() => onPreview(null)}>
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
        <ChipSelect options={PLATFORM_CHIPS} value={selectedChip} onChange={onSelectedChip} />
      </div>

      {somethingElse && (
        <div className="space-y-2">
          <Label htmlFor="platform-notes">Where do you sell?</Label>
          <Input
            id="platform-notes"
            placeholder="yourshop.com"
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function BrandStep({
  api,
  form,
  logo,
  onLogo,
  referral,
  onReferral,
  referralOther,
  onReferralOther,
}: {
  api: StepWizardApi;
  form: RHF.UseFormReturn<z.infer<typeof brandSchema>>;
  logo: UploadedFile | null;
  onLogo: (file: UploadedFile | null) => void;
  referral: string | null;
  onReferral: (referral: string | null) => void;
  referralOther: string;
  onReferralOther: (value: string) => void;
}) {
  const contactType = form.watch('contactChannel.type');
  const [referralError, setReferralError] = React.useState<string | null>(null);
  const [referralErrorKey, setReferralErrorKey] = React.useState(0);
  const referralIsOther = referral === 'Something else';

  const updateMerchantMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/merchants/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
  });

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
        await updateMerchantMutation.mutateAsync({
          name: values.name,
          accentToken: values.accentToken,
          ...(logo && { logoUrl: logo.url }),
          contactChannel: values.contactChannel,
          referralSource: referralIsOther ? referralOther.trim() : referral,
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
        <ChipSelect options={REFERRAL_CHIPS} value={referral} onChange={onReferral} />
      </div>

      {referralIsOther && (
        <div className="space-y-2">
          <Label htmlFor="referral-other">Where?</Label>
          <Input
            id="referral-other"
            placeholder="A podcast, a newsletter, ..."
            value={referralOther}
            onChange={(e) => onReferralOther(e.target.value)}
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

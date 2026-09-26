'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import * as RHF from 'react-hook-form';
import { XIcon } from '@phosphor-icons/react/ssr';
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

const urlSchema = z.object({ urls: z.array(z.object({ value: z.string() })) });
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

  const productForm = useZodForm(urlSchema, { defaultValues: { urls: [{ value: '' }] } });
  const [productResults, setProductResults] = React.useState<CreatedLink[] | null>(null);
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
              results={productResults}
              onResults={setProductResults}
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
  results,
  onResults,
  selectedChip,
  onSelectedChip,
  notes,
  onNotes,
  onCreated,
}: {
  api: StepWizardApi;
  form: RHF.UseFormReturn<z.infer<typeof urlSchema>>;
  results: CreatedLink[] | null;
  onResults: (links: CreatedLink[] | null) => void;
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
  const [trackingScriptSrc, setTrackingScriptSrc] = React.useState<string | null>(null);
  const [failedCount, setFailedCount] = React.useState(0);
  const somethingElse = selectedChip === 'Something else';
  const urlFields = RHF.useFieldArray({ control: form.control, name: 'urls' });

  // One product context matters for a single-shop try-on link; several
  // matter for giving the system real catalog breadth up front, so every
  // pasted URL is scraped at once instead of one at a time.
  const createLinksMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const settled = await Promise.allSettled(
        urls.map(async (url) => {
          const res = await fetch('/api/links', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kind: 'single', url }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error?.message ?? "We couldn't read that page.");
          return json as CreatedLink;
        }),
      );
      return {
        created: settled
          .filter((r): r is PromiseFulfilledResult<CreatedLink> => r.status === 'fulfilled')
          .map((r) => r.value),
        failed: settled.filter((r) => r.status === 'rejected').length,
      };
    },
  });

  const platformRequestMutation = useMutation({
    mutationFn: async (requestNotes: string) => {
      const res = await fetch('/api/platform-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: requestNotes }),
      });
      return res.json().catch(() => null);
    },
  });

  React.useEffect(() => {
    api.setOnNext(async () => {
      setError(null);

      // These two branches already have their own confirmation UI below
      // (the tracking-script embed, the found-product summary); once shown,
      // the wizard's own Next button is what advances past them rather than
      // a second local button also calling `api.next()` — otherwise the
      // wizard's stale pre-confirmation handler stays registered and Next
      // silently re-runs the original scrape/request instead of advancing.
      if (trackingScriptSrc) return true;
      if (results) {
        onCreated(results[0]);
        return true;
      }

      const urls = form
        .getValues('urls')
        .map((u) => u.value.trim())
        .filter(Boolean);

      if (urls.length > 0) {
        const invalidUrl = urls.find((u) => !z.string().url().safeParse(u).success);
        if (invalidUrl) {
          setError('One of those links looks incomplete. Check it and try again.');
          return false;
        }
        try {
          const { created, failed } = await createLinksMutation.mutateAsync(urls);
          if (created.length === 0) {
            setError("We couldn't read any of those pages. Check the links and try again.");
            return false;
          }
          setFailedCount(failed);
          onResults(created);
        } catch (err) {
          setError(err instanceof Error ? err.message : "We couldn't read those pages.");
        }
        return false;
      }

      if (somethingElse) {
        if (!notes.trim()) {
          setError('Tell us where you sell so we know what to build next.');
          return false;
        }
        const json = await platformRequestMutation.mutateAsync(notes);
        if (json?.trackingScriptSrc) {
          setTrackingScriptSrc(json.trackingScriptSrc);
          return false;
        }
        return true;
      }

      if (selectedChip) return true;

      setError('Paste a product link, or tell us where you sell below.');
      return false;
    });
    return () => api.setOnNext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somethingElse, selectedChip, notes, results, trackingScriptSrc]);

  if (trackingScriptSrc) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add this one line to your site so we can find your product pages. You can skip this for
          now and come back to it anytime from Settings.
        </p>
        <CopyField
          label="Embed snippet"
          value={`<script src="${trackingScriptSrc}" async></script>`}
        />
      </div>
    );
  }

  if (results) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {results.length === 1
            ? 'Looks like we found this product:'
            : `Found ${results.length} product${results.length > 1 ? 's' : ''}:`}
        </p>
        <div className="space-y-2">
          {results.map((result) => (
            <div key={result.linkId} className="rounded-md border border-border p-4">
              <p className="font-medium text-foreground">{result.productTitle}</p>
            </div>
          ))}
        </div>
        {failedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {failedCount} link{failedCount > 1 ? 's' : ''} couldn&apos;t be read, only the ones
            above were added.
          </p>
        )}
        <Button variant="outline" onClick={() => onResults(null)}>
          That&apos;s not right
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Paste links to what you sell</Label>
        <p className="text-sm text-muted-foreground">
          A product page, an Instagram post, or a checkout link all work. Add as many as you like.
        </p>
      </div>

      <div className="space-y-2">
        {urlFields.fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <UrlField
              control={form.control}
              name={`urls.${i}.value`}
              label=""
              placeholder={`Product ${i + 1} URL`}
              className="flex-1"
            />
            {urlFields.fields.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => urlFields.remove(i)}>
                <XIcon className="size-4" />
                <span className="sr-only">Remove URL</span>
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => urlFields.append({ value: '' })}
      >
        Add product
      </Button>

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

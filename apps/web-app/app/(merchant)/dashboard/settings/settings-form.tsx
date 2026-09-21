'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { TextField } from '@/components/forms/text-field';
import { PhoneField } from '@/components/forms/phone-field';
import { SwatchField } from '@/components/forms/swatch-field';
import { SegmentedField } from '@/components/forms/segmented-field';
import { LoadingButton } from '@/components/loading-button';
import { UploadDropzone, type UploadedFile } from '@/components/upload-dropzone';
import { MediaTile } from '@/components/media-tile';
import { SplitPane } from '@/components/split-pane';
import { contactChannelSchema, type ContactChannel } from '@/constants';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  accentToken: z.enum(['1', '2', '3', '4', '5', '6']),
  contactChannel: contactChannelSchema,
});

async function patchMerchant(body: Record<string, unknown>) {
  await fetch('/api/merchants/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function SettingsForm({
  storeDomain,
  initial,
}: {
  storeDomain: string | null;
  initial: {
    name: string;
    accentToken: string;
    logoUrl: string | null;
    contactChannel: ContactChannel;
  };
}) {
  const router = useRouter();
  const form = useZodForm<z.infer<typeof schema>>(schema, {
    defaultValues: {
      name: initial.name,
      accentToken: (initial.accentToken as z.infer<typeof schema>['accentToken']) ?? '1',
      contactChannel: initial.contactChannel,
    },
  });
  const [logo, setLogo] = React.useState<UploadedFile | null>(
    initial.logoUrl ? { url: initial.logoUrl, key: '', name: 'logo' } : null,
  );
  const [logoUploading, setLogoUploading] = React.useState(false);
  const contactType = form.watch('contactChannel.type');

  const settingsMutation = useMutation({
    mutationFn: patchMerchant,
    onSuccess: () => router.refresh(),
  });

  const logoMutation = useMutation({
    mutationFn: (logoUrl: string) => patchMerchant({ logoUrl }),
    onSuccess: () => router.refresh(),
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    await settingsMutation.mutateAsync({
      name: values.name,
      accentToken: values.accentToken,
      ...(logo && { logoUrl: logo.url }),
      contactChannel: values.contactChannel,
    });
  }

  function handleLogoUploaded(files: UploadedFile[]) {
    const uploaded = files[0];
    if (!uploaded) return;
    setLogo(uploaded);
    logoMutation.mutate(uploaded.url);
  }

  return (
    <div className="max-w-3xl space-y-10">
      <Form form={form} onSubmit={onSubmit}>
        <SplitPane
          start={
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Store domain</p>
                <p className="text-sm text-muted-foreground">
                  {storeDomain ?? 'Not connected yet'}
                </p>
              </div>

              <TextField control={form.control} name="name" label="Brand name" />

              {logo ? (
                <MediaTile
                  src={logo.url}
                  alt="Logo"
                  aspect="1/1"
                  className="size-48"
                  onClick={() => setLogo(null)}
                  overlay={
                    <div className="flex size-full items-center justify-center bg-background/70 text-sm font-medium text-foreground opacity-0 transition-opacity hover:opacity-100">
                      Change logo
                    </div>
                  }
                />
              ) : (
                <UploadDropzone
                  accept="image/*"
                  aspect="1/1"
                  className="w-48"
                  onFiles={handleLogoUploaded}
                  onUploadingChange={setLogoUploading}
                />
              )}
            </div>
          }
          end={
            <div className="space-y-4">
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
                <PhoneField
                  control={form.control}
                  name="contactChannel.value"
                  label="Contact detail"
                />
              ) : (
                <TextField
                  control={form.control}
                  name="contactChannel.value"
                  label="Contact detail"
                  placeholder={contactType === 'instagram' ? '@yourstore' : 'you@yourstore.com'}
                />
              )}

              <LoadingButton
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={logoUploading}
              >
                Save
              </LoadingButton>
            </div>
          }
        />
      </Form>
    </div>
  );
}

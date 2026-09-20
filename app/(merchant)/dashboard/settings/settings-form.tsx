'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { SplitPane } from '@/components/split-pane';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  accentToken: z.enum(['1', '2', '3', '4', '5', '6']),
  contactType: z.enum(['whatsapp', 'instagram', 'email']),
  contactValue: z.string().min(1, 'Required'),
});

export function SettingsForm({
  storeDomain,
  initial,
}: {
  storeDomain: string | null;
  initial: {
    name: string;
    accentToken: string;
    logoUrl: string | null;
    contactType: 'whatsapp' | 'instagram' | 'email';
    contactValue: string;
  };
}) {
  const router = useRouter();
  const form = useZodForm<z.infer<typeof schema>>(schema, {
    defaultValues: {
      name: initial.name,
      accentToken: (initial.accentToken as z.infer<typeof schema>['accentToken']) ?? '1',
      contactType: initial.contactType,
      contactValue: initial.contactValue,
    },
  });
  const [logo, setLogo] = React.useState<UploadedFile | null>(
    initial.logoUrl ? { url: initial.logoUrl, key: '', name: 'logo' } : null,
  );
  const contactType = form.watch('contactType');
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function onSubmit(values: z.infer<typeof schema>) {
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
    router.refresh();
  }

  async function onDelete() {
    await fetch('/api/merchants/me/delete', { method: 'POST' });
    window.location.href = '/login';
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
                <MediaTile src={logo.url} alt="Logo" aspect="1/1" className="size-20" />
              ) : (
                <UploadDropzone
                  accept="image/*"
                  aspect="1/1"
                  className="w-32"
                  onFiles={(files) => setLogo(files[0] ?? null)}
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

              <LoadingButton type="submit" loading={form.formState.isSubmitting}>
                Save
              </LoadingButton>
            </div>
          }
        />
      </Form>

      <div className="space-y-2 border-t border-border pt-6">
        <p className="text-sm font-medium text-destructive">Delete account</p>
        <p className="text-sm text-muted-foreground">
          Removes your links, leads, and credit history. Product and render history tied to your
          store is preserved for the shoppers who created it.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          Delete account
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete your account?"
          description="This can't be undone."
          confirmLabel="Delete"
          tone="destructive"
          onConfirm={onDelete}
        />
      </div>
    </div>
  );
}

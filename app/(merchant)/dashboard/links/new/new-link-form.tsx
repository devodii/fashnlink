'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { UrlField } from '@/components/forms/url-field';
import { LoadingButton } from '@/components/loading-button';
import { ProgressSteps, type ProgressStep } from '@/components/progress-steps';
import { InlineAlert } from '@/components/inline-alert';

const schema = z.object({ url: z.string().url('Paste a full product URL') });
type FormValues = z.infer<typeof schema>;

// Section 8.1/8.2's "paste a URL" flow — the same `POST /api/links` route
// onboarding step 1 uses (src/modules/links/create-link-from-url.ts), so a
// link created here and one created during onboarding go through identical
// scrape -> wearable-gate -> persist logic.
export function NewLinkForm() {
  const router = useRouter();
  const form = useZodForm(schema, { defaultValues: { url: '' } });
  const [stage, setStage] = React.useState<'idle' | 'working' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const steps: ProgressStep[] = [
    {
      label: 'Detecting platform',
      state: stage === 'working' ? 'active' : stage === 'idle' ? 'pending' : 'done',
    },
    {
      label: 'Fetching product',
      state: stage === 'working' ? 'pending' : stage === 'idle' ? 'pending' : 'done',
    },
    {
      label: 'Creating link',
      state: stage === 'idle' ? 'pending' : stage === 'error' ? 'error' : 'done',
    },
  ];

  async function onSubmit(values: FormValues) {
    setStage('working');
    setError(null);
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      setStage('error');
      setError(json.error?.message ?? 'Something went wrong');
      return;
    }
    router.push(`/dashboard/links/${json.linkId}`);
  }

  return (
    <div className="max-w-md space-y-6">
      <Form form={form} onSubmit={onSubmit} className="space-y-4">
        <UrlField
          control={form.control}
          name="url"
          label="Product URL"
          placeholder="https://yourshop.com/products/linen-shirt"
        />
        <LoadingButton type="submit" loading={stage === 'working'} className="w-full">
          Create link
        </LoadingButton>
      </Form>

      {stage !== 'idle' && <ProgressSteps steps={steps} />}
      {error && <InlineAlert tone="destructive">{error}</InlineAlert>}
    </div>
  );
}

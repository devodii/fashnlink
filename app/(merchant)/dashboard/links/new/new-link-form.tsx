'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { UrlField } from '@/components/forms/url-field';
import { TextField } from '@/components/forms/text-field';
import { LoadingButton } from '@/components/loading-button';
import { ProgressSteps, type ProgressStep } from '@/components/progress-steps';
import { InlineAlert } from '@/components/inline-alert';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Kind = 'single' | 'poll' | 'group';

const singleSchema = z.object({ url: z.string().url('Paste a full product URL') });
const groupSchema = z.object({
  url: z.string().url('Paste a full product URL'),
  groupName: z.string().min(1, 'Give the group a name'),
  groupNote: z.string().optional(),
});

async function createLink(body: unknown): Promise<{ linkId: string }> {
  const res = await fetch('/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong');
  return json;
}

export function NewLinkForm() {
  const router = useRouter();
  const [kind, setKind] = React.useState<Kind>('single');
  const [stage, setStage] = React.useState<'idle' | 'working' | 'error'>('idle');
  const [error, setErrorState] = React.useState<string | null>(null);
  const [errorKey, setErrorKey] = React.useState(0);
  const setError = (msg: string | null) => {
    setErrorState(msg);
    if (msg) setErrorKey((k) => k + 1);
  };
  const [pollUrls, setPollUrls] = React.useState<string[]>(['', '']);

  const singleForm = useZodForm(singleSchema, { defaultValues: { url: '' } });
  const groupForm = useZodForm(groupSchema, {
    defaultValues: { url: '', groupName: '', groupNote: '' },
  });

  const createLinkMutation = useMutation({
    mutationFn: createLink,
    onMutate: () => {
      setStage('working');
      setError(null);
    },
    onSuccess: (data) => router.push(`/dashboard/links/${data.linkId}`),
    onError: (err) => {
      setStage('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    },
  });

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

  async function post(body: unknown) {
    createLinkMutation.mutate(body);
  }

  return (
    <div className="max-w-md space-y-6">
      <SegmentedControl
        value={kind}
        onChange={(v) => setKind(v as Kind)}
        options={[
          { value: 'single', label: 'Single' },
          { value: 'poll', label: 'Poll' },
          { value: 'group', label: 'Group' },
        ]}
      />

      {kind === 'single' && (
        <Form
          form={singleForm}
          onSubmit={(v) => post({ kind: 'single', ...v })}
          className="space-y-4"
        >
          <UrlField
            control={singleForm.control}
            name="url"
            label="Product URL"
            placeholder="https://yourshop.com/products/linen-shirt"
          />
          <LoadingButton type="submit" loading={stage === 'working'} className="w-full">
            Create link
          </LoadingButton>
        </Form>
      )}

      {kind === 'poll' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add 2 or 3 product URLs so shoppers can try on all of them.
          </p>
          <div className="space-y-2">
            {pollUrls.map((url, i) => (
              <Input
                key={i}
                type="url"
                placeholder={`Product ${i + 1} URL`}
                value={url}
                onChange={(e) =>
                  setPollUrls((prev) => prev.map((u, idx) => (idx === i ? e.target.value : u)))
                }
              />
            ))}
          </div>
          {pollUrls.length < 3 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPollUrls((p) => [...p, ''])}
            >
              Add another
            </Button>
          )}
          <LoadingButton
            loading={stage === 'working'}
            className="w-full"
            disabled={pollUrls.filter(Boolean).length < 2}
            onClick={() => post({ kind: 'poll', urls: pollUrls.filter(Boolean) })}
          >
            Create poll
          </LoadingButton>
        </div>
      )}

      {kind === 'group' && (
        <Form
          form={groupForm}
          onSubmit={(v) =>
            post({
              kind: 'group',
              url: v.url,
              groupName: v.groupName,
              groupNote: v.groupNote || null,
            })
          }
          className="space-y-4"
        >
          <UrlField
            control={groupForm.control}
            name="url"
            label="Product URL"
            placeholder="https://yourshop.com/products/linen-shirt"
          />
          <TextField
            control={groupForm.control}
            name="groupName"
            label="Group name"
            placeholder="Bridesmaids"
          />
          <TextField control={groupForm.control} name="groupNote" label="Note (optional)" />
          <LoadingButton type="submit" loading={stage === 'working'} className="w-full">
            Create group link
          </LoadingButton>
        </Form>
      )}

      {stage !== 'idle' && <ProgressSteps steps={steps} />}
      {error && (
        <InlineAlert tone="destructive" resetKey={errorKey}>
          {error}
        </InlineAlert>
      )}
    </div>
  );
}

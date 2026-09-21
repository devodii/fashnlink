'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';
import { SwitchField } from '@/components/forms/switch-field';
import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { InlineAlert } from '@/components/inline-alert';

const schema = z.object({
  provider: z.enum(['klaviyo', 'mailchimp']),
  apiKey: z.string().min(1, 'Required'),
  listId: z.string().optional(),
  abandonedEnabled: z.boolean(),
});

export interface RetargetingFormProps {
  connected: boolean;
  provider: 'klaviyo' | 'mailchimp' | null;
  status: 'active' | 'invalid' | null;
  abandonedEnabled: boolean;
}

export function RetargetingForm({
  connected,
  provider,
  status,
  abandonedEnabled,
}: RetargetingFormProps) {
  const form = useZodForm<z.infer<typeof schema>>(schema, {
    defaultValues: {
      provider: provider ?? 'klaviyo',
      apiKey: '',
      listId: '',
      abandonedEnabled,
    },
  });
  const [testResult, setTestResult] = React.useState<'idle' | 'ok' | 'failed'>('idle');
  const [testKey, setTestKey] = React.useState(0);

  const connectMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await fetch('/api/merchants/me/esp-connection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => window.location.reload(),
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/merchants/me/esp-connection?test=true', { method: 'POST' });
      if (!res.ok) throw new Error('Test failed');
    },
    onSuccess: () => {
      setTestResult('ok');
      setTestKey((k) => k + 1);
    },
    onError: () => {
      setTestResult('failed');
      setTestKey((k) => k + 1);
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    await connectMutation.mutateAsync({ ...values, listId: values.listId || null });
  }

  function handleTest() {
    testConnectionMutation.mutate();
  }

  return (
    <div className="space-y-4">
      {connected && (
        <InlineAlert tone={status === 'active' ? 'success' : 'destructive'}>
          Connected to {provider}: {status === 'active' ? 'active' : 'needs attention'}.
        </InlineAlert>
      )}
      <Form form={form} onSubmit={onSubmit} className="space-y-4">
        <SelectField
          control={form.control}
          name="provider"
          label="Provider"
          options={[
            { value: 'klaviyo', label: 'Klaviyo' },
            { value: 'mailchimp', label: 'Mailchimp' },
          ]}
        />
        <TextField
          control={form.control}
          name="apiKey"
          label="API key"
          placeholder={connected ? 'Enter a new key to replace the connected one' : 'sk_...'}
        />
        <TextField
          control={form.control}
          name="listId"
          label="List ID (Mailchimp only)"
          placeholder="optional"
        />
        <SwitchField
          control={form.control}
          name="abandonedEnabled"
          label="Send abandoned try-on events"
        />
        <div className="flex gap-2">
          <LoadingButton type="submit" loading={form.formState.isSubmitting}>
            {connected ? 'Update connection' : 'Connect'}
          </LoadingButton>
          {connected && (
            <Button
              type="button"
              variant="outline"
              disabled={testConnectionMutation.isPending}
              onClick={handleTest}
            >
              Test connection
            </Button>
          )}
        </div>
      </Form>
      {testResult === 'ok' && (
        <InlineAlert tone="success" resetKey={testKey}>
          Test event sent.
        </InlineAlert>
      )}
      {testResult === 'failed' && (
        <InlineAlert tone="destructive" resetKey={testKey}>
          Test failed, check the API key and try again.
        </InlineAlert>
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LoadingButton } from '@/components/loading-button';
import { SelectField } from '@/components/forms/select-field';
import { useZodForm } from '@/hooks/use-zod-form';
import { z } from 'zod';

const GARMENT_CATEGORIES = [
  'top',
  'bottom',
  'one_piece',
  'outerwear',
  'shoes',
  'accessory',
  'set',
  'unknown',
] as const;

async function patchLink(id: string, body: Record<string, unknown>) {
  await fetch(`/api/links/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function PauseArchiveButtons({ linkId, status }: { linkId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);

  async function setStatus(next: 'active' | 'paused' | 'archived') {
    setLoading(next);
    await patchLink(linkId, { status: next });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status !== 'active' && (
        <LoadingButton
          size="sm"
          variant="outline"
          loading={loading === 'active'}
          onClick={() => setStatus('active')}
        >
          Activate
        </LoadingButton>
      )}
      {status !== 'paused' && (
        <LoadingButton
          size="sm"
          variant="outline"
          loading={loading === 'paused'}
          onClick={() => setStatus('paused')}
        >
          Pause
        </LoadingButton>
      )}
      {status !== 'archived' && (
        <LoadingButton
          size="sm"
          variant="outline"
          loading={loading === 'archived'}
          onClick={() => setStatus('archived')}
        >
          Archive
        </LoadingButton>
      )}
    </div>
  );
}

const categoryForm = z.object({ garmentCategory: z.enum(GARMENT_CATEGORIES) });

export function GarmentCategoryField({
  linkId,
  value,
}: {
  linkId: string;
  value: (typeof GARMENT_CATEGORIES)[number];
}) {
  const router = useRouter();
  const form = useZodForm(categoryForm, { defaultValues: { garmentCategory: value } });
  const watched = form.watch('garmentCategory');

  React.useEffect(() => {
    if (watched === value) return;
    void patchLink(linkId, { garmentCategory: watched }).then(() => router.refresh());
  }, [watched, value, linkId, router]);

  return (
    <SelectField
      control={form.control}
      name="garmentCategory"
      label="Garment category"
      description="Changes which render model future try-ons use."
      options={GARMENT_CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') }))}
    />
  );
}

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { LoadingButton } from '@/components/loading-button';
import { SelectField } from '@/components/forms/select-field';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useZodForm } from '@/hooks/use-zod-form';
import { z } from 'zod';

// todo: generate this using jev based on the scraped product image
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
  const [confirming, setConfirming] = React.useState<'paused' | 'archived' | null>(null);

  const statusMutation = useMutation({
    mutationFn: (next: 'active' | 'paused' | 'archived') => patchLink(linkId, { status: next }),
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex gap-2">
      {status !== 'active' && (
        <LoadingButton
          size="sm"
          variant="outline"
          loading={statusMutation.isPending && statusMutation.variables === 'active'}
          onClick={() => statusMutation.mutate('active')}
        >
          Activate
        </LoadingButton>
      )}
      {status !== 'paused' && (
        <LoadingButton
          size="sm"
          variant="outline"
          loading={statusMutation.isPending && statusMutation.variables === 'paused'}
          onClick={() => setConfirming('paused')}
        >
          Pause
        </LoadingButton>
      )}
      {status !== 'archived' && (
        <LoadingButton
          size="sm"
          variant="outline"
          loading={statusMutation.isPending && statusMutation.variables === 'archived'}
          onClick={() => setConfirming('archived')}
        >
          Archive
        </LoadingButton>
      )}
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming === 'paused' ? 'Pause this link?' : 'Archive this link?'}
        description={
          confirming === 'paused'
            ? 'Shoppers will no longer be able to try this on until you reactivate it.'
            : 'Archived links are removed from your active list. You can reactivate it later.'
        }
        confirmLabel={confirming === 'paused' ? 'Pause' : 'Archive'}
        tone="destructive"
        onConfirm={async () => {
          if (confirming) await statusMutation.mutateAsync(confirming);
        }}
      />
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

  const categoryMutation = useMutation({
    mutationFn: (garmentCategory: string) => patchLink(linkId, { garmentCategory }),
    onSuccess: () => router.refresh(),
  });
  const mutate = categoryMutation.mutate;

  React.useEffect(() => {
    if (watched === value) return;
    mutate(watched);
  }, [watched, value, mutate]);

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

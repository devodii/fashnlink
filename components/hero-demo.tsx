'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { cn } from 'cn';
import { useZodForm } from '@/hooks/use-zod-form';
import { Form } from '@/components/forms/form';
import { UrlField } from '@/components/forms/url-field';
import { LoadingButton } from '@/components/loading-button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DEMO_CHIPS } from '@/lib/demo-assets';
import { ok, err, type Result, type AppError } from '@/lib/result';

const schema = z.object({ url: z.string().url('Paste a full product link') });
type Values = z.infer<typeof schema>;

// The quick-link route already returns human-readable messages for the
// wearable gate (not wearable / unsupported store / try another link); this
// is only the generic network-level fallback, kept equally human.
const FALLBACK_MESSAGE = "We couldn't read that product page. Try another link.";

async function createQuickLink(url: string): Promise<Result<{ slug: string }, AppError>> {
  try {
    const res = await fetch('/api/public/quick-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    if (!res.ok) {
      return err({
        code: json.error?.code ?? 'INTERNAL',
        message: json.error?.message ?? FALLBACK_MESSAGE,
      });
    }
    return ok(json);
  } catch {
    return err({ code: 'INTERNAL', message: FALLBACK_MESSAGE });
  }
}

export interface HeroDemoProps {
  className?: string;
  /** Just the input and button, no chips — for reuse where the chips were already shown once (the final CTA). */
  compact?: boolean;
  /** This form shape can render more than once on the page (hero + final CTA), so each instance needs its own DOM id. */
  id: string;
}

export function HeroDemo({ className, compact, id }: HeroDemoProps) {
  const router = useRouter();
  const form = useZodForm(schema, { defaultValues: { url: '' } });

  async function onSubmit(values: Values) {
    const result = await createQuickLink(values.url);
    if (result.ok) {
      router.push(`/t/${result.value.slug}`);
      return;
    }
    return result;
  }

  function handleChip(chipUrl: string) {
    form.setValue('url', chipUrl, { shouldValidate: true });
    void form.handleSubmit(onSubmit)();
  }

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <Form form={form} onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <UrlField
            control={form.control}
            name="url"
            id={id}
            label=""
            placeholder="Paste any product link"
            className="flex-1 [&_[data-slot=input]]:h-12"
          />
          <LoadingButton
            type="submit"
            loading={form.formState.isSubmitting}
            className="h-12 shrink-0 rounded-md px-5"
          >
            Try it
          </LoadingButton>
        </div>

        {!compact && (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value=""
            onValueChange={(value) => {
              const chip = DEMO_CHIPS.find((c) => c.value === value);
              if (chip) handleChip(chip.url);
            }}
            className="flex-wrap justify-start gap-2"
          >
            {DEMO_CHIPS.map((chip) => (
              <ToggleGroupItem key={chip.value} value={chip.value} className="rounded-full border">
                {chip.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </Form>
    </div>
  );
}

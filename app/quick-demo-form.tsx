'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/loading-button';

export function QuickDemoForm() {
  const router = useRouter();
  const [url, setUrl] = React.useState('');
  const [navigating, setNavigating] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNavigating(true);
    const requestId =
      typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36);
    router.push(`/demo/${requestId}?url=${encodeURIComponent(url)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <Input
        type="url"
        required
        placeholder="https://yourshop.com/products/linen-shirt"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <LoadingButton type="submit" loading={navigating}>
        See it on you
      </LoadingButton>
    </form>
  );
}

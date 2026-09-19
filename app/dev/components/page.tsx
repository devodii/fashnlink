import { notFound } from 'next/navigation';
import { env } from '@/lib/env';
import { DevComponentsGallery } from '@/components/dev-components-gallery';

// Section 12 (M1.5): dev-only, excluded from production. `notFound()` must
// run in the server render path to actually 404 the route — a `'use client'`
// module can't gate itself this way, so the gallery's interactive content
// lives in `DevComponentsGallery` and this file is just the gate.
export default function DevComponentsPage() {
  if (env.NODE_ENV === 'production') notFound();
  return <DevComponentsGallery />;
}

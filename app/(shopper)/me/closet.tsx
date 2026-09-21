'use client';

import * as React from 'react';
import Image from 'next/image';
import { ImagesIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import { MediaGrid } from '@/components/media-grid';
import { EmptyState } from '@/components/empty-state';
import { ShareSheet } from '@/components/share-sheet';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/section';

type ClosetRender = {
  renderId: string;
  outputUrl: string;
  isPublic: boolean;
  buyUrl: string | null;
  productTitle: string;
  merchantName: string;
};

type ClosetTwin = { id: string; twinUrl: string | null; isDefault: boolean };

export interface ClosetProps {
  renders: ClosetRender[];
  twins: ClosetTwin[];
  hasEmail: boolean;
}

export function Closet({ renders: initialRenders, twins, hasEmail }: ClosetProps) {
  const [renders, setRenders] = React.useState(initialRenders);
  const [confirmDeleteAll, setConfirmDeleteAll] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [emailSaved, setEmailSaved] = React.useState(false);

  const grouped = React.useMemo(() => {
    const byMerchant = new Map<string, ClosetRender[]>();
    for (const r of renders) {
      const list = byMerchant.get(r.merchantName) ?? [];
      list.push(r);
      byMerchant.set(r.merchantName, list);
    }
    return Array.from(byMerchant.entries());
  }, [renders]);

  async function handleDelete(renderId: string) {
    setRenders((prev) => prev.filter((r) => r.renderId !== renderId));
    await fetch(`/api/renders/${renderId}`, { method: 'DELETE' }).catch(() => {});
  }

  async function handleTogglePrivate(render: ClosetRender) {
    const next = !render.isPublic;
    setRenders((prev) =>
      prev.map((r) => (r.renderId === render.renderId ? { ...r, isPublic: next } : r)),
    );
    await fetch(`/api/renders/${render.renderId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'visibility', isPublic: next }),
    }).catch(() => {});
  }

  async function handleDeleteEverything() {
    await fetch('/api/me', { method: 'DELETE' }).catch(() => {});
    window.location.href = '/';
  }

  async function handleSaveEmail() {
    if (!email) return;
    const res = await fetch('/api/shoppers/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) setEmailSaved(true);
  }

  const defaultTwin = twins.find((t) => t.isDefault) ?? twins[0] ?? null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      {defaultTwin?.twinUrl && (
        <Section title="Your model">
          <div className="relative aspect-3/4 w-32 overflow-hidden rounded-md">
            <Image
              src={defaultTwin.twinUrl}
              alt="Your twin"
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
        </Section>
      )}

      {grouped.length === 0 ? (
        <EmptyState
          icon={ImagesIcon}
          title="Nothing here yet"
          description="Try something on from a shop's link and it'll show up here."
        />
      ) : (
        grouped.map(([merchantName, items]) => (
          <Section key={merchantName} title={merchantName}>
            <MediaGrid
              items={items.map((render) => ({
                src: render.outputUrl,
                alt: render.productTitle,
                overlay: (
                  <div className="flex items-end justify-between gap-2 p-2">
                    <div className="flex gap-1">
                      <ShareSheet
                        title={render.productTitle}
                        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${render.renderId}`}
                        onShare={() => {
                          fetch(`/api/renders/${render.renderId}`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ event: 'share' }),
                          }).catch(() => {});
                        }}
                        trigger={
                          <Button size="sm" variant="secondary">
                            Share
                          </Button>
                        }
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTogglePrivate(render)}
                      >
                        {render.isPublic ? 'Make private' : 'Make public'}
                      </Button>
                      {render.buyUrl && (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={render.buyUrl} target="_blank" rel="noopener noreferrer">
                            Buy
                          </a>
                        </Button>
                      )}
                    </div>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      onClick={() => handleDelete(render.renderId)}
                    >
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </div>
                ),
              }))}
            />
          </Section>
        ))
      )}

      {!hasEmail && !emailSaved && (
        <Section title="Save your closet">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveEmail} disabled={!email}>
              Save
            </Button>
          </div>
        </Section>
      )}

      <Section title="Delete everything">
        <Button variant="outline" onClick={() => setConfirmDeleteAll(true)}>
          Delete my data
        </Button>
      </Section>

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title="Delete everything?"
        description="This permanently deletes your photos, twin, and closet. This can't be undone."
        confirmLabel="Delete everything"
        tone="destructive"
        onConfirm={handleDeleteEverything}
      />
    </div>
  );
}

'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { LinkIcon } from '@phosphor-icons/react/ssr';
import { Card } from '@/components/ui/card';
import { MediaTile } from '@/components/media-tile';
import { PhoneFrame } from '@/components/phone-frame';
import { DataTable } from '@/components/data-table';
import { Presence } from '@/components/motion/presence';
import { motion, useReducedMotion } from 'framer-motion';
import {
  DEMO_PRODUCT,
  DEMO_RENDER_URL,
  DEMO_TWIN_SECOND_PRODUCT,
  MARQUEE_RENDERS,
} from '@/lib/demo-assets';

export function LinkPasteMedia() {
  const reduceMotion = useReducedMotion();
  const [showProduct, setShowProduct] = React.useState(reduceMotion ?? false);

  React.useEffect(() => {
    if (reduceMotion) {
      setShowProduct(true);
      return;
    }
    const id = setInterval(() => setShowProduct((v) => !v), 2200);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <Card className="gap-3 p-6">
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-border px-3 py-2">
        <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate text-sm text-muted-foreground">{DEMO_PRODUCT.url}</span>
      </div>
      <Presence>
        {showProduct && (
          <motion.div
            key="product"
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <MediaTile
              src={DEMO_PRODUCT.imageUrl}
              alt={DEMO_PRODUCT.title}
              aspect="1/1"
              className="size-16"
            />
            <p className="text-sm font-medium text-foreground">{DEMO_PRODUCT.title}</p>
          </motion.div>
        )}
      </Presence>
    </Card>
  );
}

export function ChatPreviewMedia() {
  return (
    <Card className="gap-3 p-6">
      <div className="flex flex-col gap-2">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-muted px-3 py-2 text-sm text-foreground">
          check this out
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          see it on you: tryonlink.co/t/ada
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-border p-2">
        <MediaTile
          src={DEMO_PRODUCT.imageUrl}
          alt={DEMO_PRODUCT.title}
          aspect="1/1"
          className="size-12"
        />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">{DEMO_PRODUCT.title}</span>
          <span className="text-xs text-muted-foreground">tryonlink.co</span>
        </div>
      </div>
    </Card>
  );
}

export function TryOnRevealMedia() {
  return (
    <PhoneFrame>
      <MediaTile
        src={DEMO_RENDER_URL}
        alt="Shopper wearing the item"
        className="size-full rounded-none"
        cropWatermark
      />
    </PhoneFrame>
  );
}

interface LeadRow {
  product: string;
  render: string;
  email: string;
  when: string;
}

const LEAD_ROWS: LeadRow[] = [
  {
    product: DEMO_PRODUCT.imageUrl,
    render: DEMO_RENDER_URL,
    email: 'ada@example.com',
    when: '2h ago',
  },
  {
    product: DEMO_TWIN_SECOND_PRODUCT.imageUrl,
    render: DEMO_TWIN_SECOND_PRODUCT.renderUrl,
    email: 'mo@example.com',
    when: '5h ago',
  },
  {
    product: DEMO_PRODUCT.imageUrl,
    render: DEMO_RENDER_URL,
    email: 'tobi@example.com',
    when: '1d ago',
  },
  {
    product: DEMO_TWIN_SECOND_PRODUCT.imageUrl,
    render: MARQUEE_RENDERS[2].src,
    email: 'zainab@example.com',
    when: '2d ago',
  },
];

const columns: ColumnDef<LeadRow>[] = [
  {
    accessorKey: 'product',
    header: 'Product',
    cell: ({ row }) => (
      <MediaTile src={row.original.product} alt="Product" aspect="1/1" className="size-10" />
    ),
  },
  {
    accessorKey: 'render',
    header: 'Render',
    cell: ({ row }) => (
      <MediaTile
        src={row.original.render}
        alt="Render"
        aspect="1/1"
        className="size-10"
        cropWatermark
      />
    ),
  },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'when',
    header: 'Tried on',
    cell: ({ row }) => `Tried on ${row.original.when}`,
  },
];

export function LeadsTableMedia() {
  return (
    <Card className="gap-3 p-4">
      <DataTable
        columns={columns}
        data={LEAD_ROWS}
        emptyState={<p className="text-sm text-muted-foreground">No leads yet</p>}
        mobileCard={(row) => (
          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <MediaTile src={row.product} alt="Product" aspect="1/1" className="size-10" />
            <MediaTile
              src={row.render}
              alt="Render"
              aspect="1/1"
              className="size-10"
              cropWatermark
            />
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-foreground">{row.email}</span>
              <span className="text-xs text-muted-foreground">Tried on {row.when}</span>
            </div>
          </div>
        )}
      />
    </Card>
  );
}

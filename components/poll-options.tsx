'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from 'cn';
import { motion, useReducedMotion } from 'framer-motion';
import { MagnifyingGlassPlusIcon } from '@phosphor-icons/react/ssr';
import { Pressable } from '@/components/motion/pressable';
import { ResponsiveDialog } from '@/components/responsive-dialog';
import { PinchZoomImage } from '@/components/pinch-zoom-image';
import { useZoomOrigin } from '@/hooks/use-zoom-origin';

export interface PollOption {
  id: string;
  image: string;
  label: string;
  votes?: number;
}

export interface PollOptionsProps {
  options: PollOption[];
  value?: string;
  onVote: (id: string) => void;
  results?: boolean;
  className?: string;
}

export function PollOptions({ options, value, onVote, results, className }: PollOptionsProps) {
  const total = options.reduce((sum, o) => sum + (o.votes ?? 0), 0);
  const [zoomedOption, setZoomedOption] = React.useState<PollOption | null>(null);

  return (
    <>
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {options.map((option) => (
          <PollOptionCard
            key={option.id}
            option={option}
            selected={value === option.id}
            pct={results && total > 0 ? Math.round(((option.votes ?? 0) / total) * 100) : null}
            onVote={() => onVote(option.id)}
            onZoom={() => setZoomedOption(option)}
          />
        ))}
      </div>
      <ResponsiveDialog
        open={!!zoomedOption}
        onOpenChange={(open) => !open && setZoomedOption(null)}
        title={zoomedOption?.label ?? ''}
        className="p-0 sm:max-w-2xl"
      >
        {zoomedOption && (
          <PinchZoomImage
            src={zoomedOption.image}
            alt={zoomedOption.label}
            className="h-[70vh] w-full"
          />
        )}
      </ResponsiveDialog>
    </>
  );
}

function PollOptionCard({
  option,
  selected,
  pct,
  onVote,
  onZoom,
}: {
  option: PollOption;
  selected: boolean;
  pct: number | null;
  onVote: () => void;
  onZoom: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { style: zoomStyle, handlers } = useZoomOrigin();

  return (
    <Pressable onClick={onVote} className="cursor-pointer space-y-2">
      <div
        className={cn(
          'group relative aspect-3/4 overflow-hidden rounded-md bg-muted ring-2 ring-transparent',
          selected && 'ring-ring',
        )}
        {...handlers}
      >
        <Image
          src={option.image}
          alt={option.label}
          fill
          sizes="50vw"
          style={zoomStyle}
          className="object-cover"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 max-md:opacity-100"
        >
          <MagnifyingGlassPlusIcon className="size-3.5" />
          <span className="sr-only">Zoom {option.label}</span>
        </button>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{option.label}</p>
        {pct !== null && (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.4 }}
            />
          </div>
        )}
        {pct !== null && <p className="text-xs text-muted-foreground">{pct}%</p>}
      </div>
    </Pressable>
  );
}

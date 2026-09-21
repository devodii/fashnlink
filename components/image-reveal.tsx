import * as React from 'react';
import { cn } from 'cn';
import { MagnifyingGlassPlusIcon } from '@phosphor-icons/react/ssr';
import { Reveal } from '@/components/motion/reveal';
import { ResponsiveDialog } from '@/components/responsive-dialog';
import { PinchZoomImage } from '@/components/pinch-zoom-image';

export interface ImageRevealProps {
  from: string;
  to: string | null;
  alt: string;
  aspect?: '3/4' | '1/1' | '9/16';
  className?: string;
  /** Click to open the currently-shown image full size, pinch/scroll to zoom. */
  zoomable?: boolean;
}

export function ImageReveal({
  from,
  to,
  alt,
  aspect = '3/4',
  className,
  zoomable,
}: ImageRevealProps) {
  const [open, setOpen] = React.useState(false);
  const active = to ?? from;

  const reveal = (
    <Reveal
      revealed={!!to}
      className={cn(
        'rounded-md bg-muted',
        aspect === '3/4' && 'aspect-3/4',
        aspect === '1/1' && 'aspect-square',
        aspect === '9/16' && 'aspect-9/16',
        className,
      )}
      from={
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={from}
          alt={alt}
          className={cn(
            'size-full object-cover',
            zoomable && 'transition-transform duration-300 ease-out group-hover:scale-105',
          )}
        />
      }
      to={
        to ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={to}
            alt={alt}
            className={cn(
              'size-full object-cover',
              zoomable && 'transition-transform duration-300 ease-out group-hover:scale-105',
            )}
          />
        ) : null
      }
    />
  );

  if (!zoomable) return reveal;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-md"
      >
        {reveal}
        <span className="pointer-events-none absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 max-md:opacity-100">
          <MagnifyingGlassPlusIcon className="size-3.5" />
        </span>
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title={alt} className="p-0 sm:max-w-2xl">
        <PinchZoomImage src={active} alt={alt} className="h-[70vh] w-full" />
      </ResponsiveDialog>
    </>
  );
}

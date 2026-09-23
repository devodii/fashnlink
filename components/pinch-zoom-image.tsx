'use client';

import * as React from 'react';
import { cn } from 'cn';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export interface PinchZoomImageProps {
  src: string;
  alt: string;
  className?: string;
}

function pointerDistance(a: React.PointerEvent, b: React.PointerEvent): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Dependency-free pinch/pan/scroll zoom on a single image: two active
 * pointers drive pinch-to-zoom, one pointer pans once zoomed in, and a
 * double click/tap toggles between 1x and 2x. Pointer Events unify
 * touch and mouse instead of needing separate touch/mouse handlers.
 */
export function PinchZoomImage({ src, alt, className }: PinchZoomImageProps) {
  const pointers = React.useRef(new Map<number, React.PointerEvent>());
  const pinchStartDistance = React.useRef(0);
  const pinchStartScale = React.useRef(1);
  const panStart = React.useRef<{ x: number; y: number; originX: number; originY: number } | null>(
    null,
  );
  const [scale, setScale] = React.useState(1);
  const [origin, setOrigin] = React.useState({ x: 0, y: 0 });
  const [interacting, setInteracting] = React.useState(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, e);
    setInteracting(true);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStartDistance.current = pointerDistance(a, b);
      pinchStartScale.current = scale;
    } else if (pointers.current.size === 1 && scale > 1) {
      panStart.current = { x: e.clientX, y: e.clientY, originX: origin.x, originY: origin.y };
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, e);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (pinchStartDistance.current > 0) {
        const next = clampScale(
          pinchStartScale.current * (pointerDistance(a, b) / pinchStartDistance.current),
        );
        setScale(next);
      }
    } else if (pointers.current.size === 1 && panStart.current && scale > 1) {
      setOrigin({
        x: panStart.current.originX + (e.clientX - panStart.current.x),
        y: panStart.current.originY + (e.clientY - panStart.current.y),
      });
    }
  }

  function endPointer(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    panStart.current = null;
    setInteracting(pointers.current.size > 0);
    if (pointers.current.size < 2) pinchStartDistance.current = 0;
    setScale((s) => {
      if (s <= 1) setOrigin({ x: 0, y: 0 });
      return s;
    });
  }

  function toggleZoom() {
    setScale((s) => (s > 1 ? 1 : 2));
    setOrigin({ x: 0, y: 0 });
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    setScale((s) => clampScale(s - e.deltaY * 0.01));
  }

  return (
    <div
      className={cn('relative touch-none overflow-hidden select-none', className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDoubleClick={toggleZoom}
      onWheel={handleWheel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="size-full object-contain"
        style={{
          transform: `translate(${origin.x}px, ${origin.y}px) scale(${scale})`,
          transition: interacting ? 'none' : 'transform 0.2s ease-out',
          cursor: scale > 1 ? 'grab' : 'zoom-in',
        }}
      />
    </div>
  );
}

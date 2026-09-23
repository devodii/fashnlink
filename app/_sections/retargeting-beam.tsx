'use client';

import * as React from 'react';
import { CameraIcon, EnvelopeIcon } from '@phosphor-icons/react/ssr';
import { AnimatedBeam } from '@/components/motion/animated-beam';
import { cn } from 'cn';

function Node({
  refProp,
  icon,
  label,
}: {
  refProp: React.RefObject<HTMLDivElement | null>;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={refProp}
        className="flex size-16 items-center justify-center rounded-md border border-border bg-card shadow-sm"
      >
        {icon}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function RetargetingBeam({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const fromRef = React.useRef<HTMLDivElement>(null);
  const midRef = React.useRef<HTMLDivElement>(null);
  const toRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center justify-between gap-4 px-2 py-6', className)}
    >
      <Node
        refProp={fromRef}
        icon={<CameraIcon className="size-6 text-foreground" />}
        label="Try-on"
      />
      <Node
        refProp={midRef}
        icon={<span className="text-xs font-medium text-foreground">Klaviyo</span>}
        label="Your flow"
      />
      <Node
        refProp={toRef}
        icon={<EnvelopeIcon className="size-6 text-foreground" />}
        label="Inbox"
      />
      <AnimatedBeam containerRef={containerRef} fromRef={fromRef} toRef={midRef} />
      <AnimatedBeam containerRef={containerRef} fromRef={midRef} toRef={toRef} />
    </div>
  );
}

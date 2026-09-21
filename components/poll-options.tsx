'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from 'cn';
import { motion, useReducedMotion } from 'framer-motion';
import { Pressable } from '@/components/motion/pressable';

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
  const reduceMotion = useReducedMotion();
  const total = options.reduce((sum, o) => sum + (o.votes ?? 0), 0);

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {options.map((option) => {
        const pct = results && total > 0 ? Math.round(((option.votes ?? 0) / total) * 100) : null;
        return (
          <Pressable
            key={option.id}
            onClick={() => onVote(option.id)}
            className="cursor-pointer space-y-2"
          >
            <div
              className={cn(
                'relative aspect-3/4 overflow-hidden rounded-md bg-muted ring-2 ring-transparent',
                value === option.id && 'ring-ring',
              )}
            >
              <Image
                src={option.image}
                alt={option.label}
                fill
                sizes="50vw"
                className="object-cover"
              />
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
      })}
    </div>
  );
}

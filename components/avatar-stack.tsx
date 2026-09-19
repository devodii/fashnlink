import * as React from 'react';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar';

export interface AvatarStackItem {
  src?: string;
  alt: string;
}

export interface AvatarStackProps {
  items: AvatarStackItem[];
  max?: number;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

/** Section 10.4: group members (section 9.4) — thin wrapper over the
 * generated `AvatarGroup` primitive that takes plain `{ src, alt }` data. */
export function AvatarStack({ items, max = 5, size = 'default', className }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;

  return (
    <AvatarGroup className={className}>
      {visible.map((item, i) => (
        <Avatar key={i} size={size}>
          <AvatarImage src={item.src} alt={item.alt} />
          <AvatarFallback>{item.alt.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && <AvatarGroupCount>+{overflow}</AvatarGroupCount>}
    </AvatarGroup>
  );
}

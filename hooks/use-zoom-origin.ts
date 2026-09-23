'use client';

import * as React from 'react';

/**
 * Cursor-tracked hover magnifier state, returned as a ready-to-spread style
 * object rather than Tailwind classes: a `group-hover:scale-[...]` utility
 * on a Next/Image `fill` element loses to Next's own injected inline
 * styles, so scale and transform-origin are both driven inline here,
 * which always wins on specificity. transform-origin updates on every
 * mousemove with no transition, so panning around the zoomed image tracks
 * the cursor instantly; scale eases in/out on hover enter/exit.
 */
export function useZoomOrigin(scale = 2.5) {
  const [origin, setOrigin] = React.useState({ x: 50, y: 50 });
  const [hovering, setHovering] = React.useState(false);

  const onMouseMove = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const onMouseEnter = React.useCallback(() => setHovering(true), []);
  const onMouseLeave = React.useCallback(() => {
    setHovering(false);
    setOrigin({ x: 50, y: 50 });
  }, []);

  const style: React.CSSProperties = {
    transformOrigin: `${origin.x}% ${origin.y}%`,
    transform: hovering ? `scale(${scale})` : 'scale(1)',
    transition: 'transform 300ms ease-out',
  };

  return { style, handlers: { onMouseMove, onMouseEnter, onMouseLeave } };
}

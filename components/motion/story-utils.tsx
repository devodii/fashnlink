/**
 * Mocks `window.matchMedia` so framer-motion's `useReducedMotion` reports
 * `true`. Deliberately NOT restored: framer-motion reads it from a
 * `useEffect` (after first paint, via a `change` listener), not
 * synchronously at render, so restoring before React ever mounts the story
 * would undo the mock before the effect ever sees it. Each story file gets
 * an isolated browser context in the vitest addon, so this doesn't leak
 * across files — within one file, put the reduced-motion story last so it
 * never affects earlier stories that expect real motion.
 */
export function withReducedMotion(Story: () => React.ReactElement) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return <Story />;
}

/**
 * Mocks window.matchMedia so framer-motion's useReducedMotion reports true.
 * Deliberately not restored: framer-motion reads it from a useEffect after
 * first paint, not synchronously at render, so restoring before React
 * mounts the story would undo the mock before the effect ever sees it.
 * Within one story file, put the reduced-motion story last so it doesn't
 * affect earlier stories that expect real motion.
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

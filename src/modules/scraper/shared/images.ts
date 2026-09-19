// Section 6.5: srcset largest-candidate selection + absolute-URL resolution,
// shared by every adapter.

export function toAbsoluteUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

// "a.jpg 480w, b.jpg 800w, c.jpg 1200w" -> "c.jpg" (widest descriptor wins;
// falls back to the last candidate if none have a width descriptor).
export function largestFromSrcset(srcset: string, base: string): string | null {
  const candidates = srcset
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [url, descriptor] = part.split(/\s+/, 2);
      const width = descriptor?.endsWith('w') ? parseInt(descriptor, 10) : 0;
      return { url, width: Number.isFinite(width) ? width : 0 };
    });
  if (!candidates.length) return null;
  const widest = candidates.reduce((a, b) => (b.width > a.width ? b : a));
  return toAbsoluteUrl(widest.url, base);
}

import type { Ctx } from '@/lib/adapter';

// Section 6.5 (generic adapter): robots.txt -> sitemap(s) -> product URLs.
// Regex-extracted rather than a real XML parser — no XML dependency is in
// the stack (section 2), and both robots.txt and sitemap `<loc>` entries are
// simple enough that a parser would be pure overhead.

const PRODUCT_URL_PATTERN = /\/(product|products|shop|item)\//i;

export async function discoverSitemapUrls(origin: string, ctx: Ctx): Promise<string[]> {
  const robotsRes = await ctx.fetch(`${origin}/robots.txt`).catch(() => null);
  const robotsText = robotsRes && robotsRes.ok ? await robotsRes.text() : '';
  const declared = [...robotsText.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  return declared.length ? declared : [`${origin}/sitemap.xml`];
}

async function fetchSitemapLocs(sitemapUrl: string, ctx: Ctx): Promise<string[]> {
  const res = await ctx.fetch(sitemapUrl).catch(() => null);
  if (!res || !res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}

// Recurses one level into sitemap indexes (a sitemap of sitemaps), fetches
// with the given concurrency, and returns product page URLs, capped at
// `maxProducts`.
//
// `sitemapNameFilter` (section 6.5's Wix adapter: "sitemap.xml ->
// store-products-sitemap*.xml") — when a child sitemap's own URL matches
// this pattern, every `<loc>` inside it is trusted as a product URL outright
// rather than re-filtered by `PRODUCT_URL_PATTERN`: Wix's real product URLs
// look like `/product-page/{slug}` (confirmed against a real store), which
// that pattern doesn't match (it expects a `product`/`shop`/`item` path
// *segment*, not a compound name like `product-page`) — the sitemap's own
// name is the more reliable signal here, not the URL shape.
export async function discoverProductUrls(
  origin: string,
  ctx: Ctx,
  opts: { maxProducts: number; concurrency?: number; sitemapNameFilter?: RegExp } = {
    maxProducts: 200,
  },
): Promise<string[]> {
  const concurrency = opts.concurrency ?? 4;
  const topLevelSitemaps = await discoverSitemapUrls(origin, ctx);

  const patternMatchedLocs: string[] = [];
  const trustedLocs: string[] = [];

  for (const sitemapUrl of topLevelSitemaps) {
    const locs = await fetchSitemapLocs(sitemapUrl, ctx);
    const childSitemapUrls = locs.filter((loc) => loc.endsWith('.xml'));
    const isIndex = childSitemapUrls.length > 0;

    if (!isIndex) {
      patternMatchedLocs.push(...locs);
      continue;
    }

    const preferred = opts.sitemapNameFilter
      ? childSitemapUrls.filter((loc) => opts.sitemapNameFilter?.test(loc))
      : [];
    const childrenToFetch = (preferred.length ? preferred : childSitemapUrls).slice(0, concurrency);

    for (const child of childrenToFetch) {
      const childLocs = await fetchSitemapLocs(child, ctx);
      if (preferred.includes(child)) trustedLocs.push(...childLocs);
      else patternMatchedLocs.push(...childLocs);
    }
  }

  const productUrls = [
    ...trustedLocs,
    ...patternMatchedLocs.filter((url) => PRODUCT_URL_PATTERN.test(url)),
  ];
  return [...new Set(productUrls)].slice(0, opts.maxProducts);
}

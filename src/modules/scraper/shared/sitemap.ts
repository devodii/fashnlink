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
// with the given concurrency, and returns only URLs that look like product
// pages, capped at `maxProducts`.
export async function discoverProductUrls(
  origin: string,
  ctx: Ctx,
  opts: { maxProducts: number; concurrency?: number } = { maxProducts: 200 },
): Promise<string[]> {
  const concurrency = opts.concurrency ?? 4;
  const topLevelSitemaps = await discoverSitemapUrls(origin, ctx);

  const allLocs: string[] = [];
  for (const sitemapUrl of topLevelSitemaps) {
    const locs = await fetchSitemapLocs(sitemapUrl, ctx);
    const isIndex = locs.some((loc) => loc.endsWith('.xml'));
    if (isIndex) {
      const childSitemaps = locs.filter((loc) => loc.endsWith('.xml')).slice(0, concurrency);
      for (const child of childSitemaps) {
        allLocs.push(...(await fetchSitemapLocs(child, ctx)));
      }
    } else {
      allLocs.push(...locs);
    }
  }

  const productUrls = allLocs.filter((url) => PRODUCT_URL_PATTERN.test(url));
  return [...new Set(productUrls)].slice(0, opts.maxProducts);
}

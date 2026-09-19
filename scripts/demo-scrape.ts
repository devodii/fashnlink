import { config } from 'dotenv';
config({ path: '.env.local' });

// Dynamic imports, deliberately: static imports are hoisted above the
// `config()` call above regardless of source order, so anything importing
// `env.ts` (which validates at module-load time) would run before .env.local
// is actually loaded.
async function main() {
  const { scrapeUrl } = await import('@/modules/scraper');
  const { createFetch } = await import('@/lib/http');
  const { logger } = await import('@/lib/log');

  const productUrl = process.argv[process.argv.indexOf('--product') + 1];
  if (!productUrl) {
    console.error('Usage: pnpm demo:scrape --product <url>');
    process.exit(1);
  }

  const log = logger.child({ requestId: 'demo' });
  const ctx = {
    log,
    requestId: 'demo',
    deadlineMs: Date.now() + 30_000,
    fetch: createFetch({ log }),
  };

  const result = await scrapeUrl(productUrl, { mode: 'product' }, ctx);
  if (!result.ok) {
    console.log('REJECTED:', JSON.stringify(result.error, null, 2));
    process.exit(result.error.code === 'INVALID_INPUT' ? 0 : 1);
  }

  console.log('SCRAPED:', JSON.stringify(result.value, null, 2));
  process.exit(0);
}

main();

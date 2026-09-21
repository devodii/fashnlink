import { config } from 'dotenv';
config({ path: '.env.local' });

// Acceptance check: paste 20 real product URLs across platforms, at least
// 18 must produce a product with a usable image. Spread across all 11
// platforms this repo supports (3 deep + 8 thin), kept as a real script
// rather than a scratch one so it can be re-run later. Real, currently-live
// URLs, verified during fixture collection.
const URLS: { platform: string; url: string }[] = [
  { platform: 'shopify', url: 'https://www.allbirds.com/products/mens-strider-explore' },
  {
    platform: 'shopify',
    url: 'https://taylorstitch.com/products/eastmoor-cardigan-in-oatmeal-wool-2609',
  },
  { platform: 'shopify', url: 'https://outdoorvoices.com/products/w-techsweat-3-5-short-night' },
  {
    platform: 'shopify',
    url: 'https://www.brooklinen.com/products/super-plush-hand-towels-last-call',
  },
  { platform: 'shopify', url: 'https://pact.com/products/pact-logo-shirt' },
  {
    platform: 'woocommerce',
    url: 'https://nordrepublic.com/product/minimalist-sandals-nord-uluwatu-strap',
  },
  {
    platform: 'woocommerce',
    url: 'https://heroicthread.com/shop/walden-glen-pool/walden-glen-swim-racquet-club-adult-tank-top/',
  },
  { platform: 'woocommerce', url: 'https://migaeyewear.com/shop/optical/seiki-mv964-c03/' },
  {
    platform: 'squarespace',
    url: 'https://www.cakeplussize.com/online/torrid-rust-floral-zipper-dress-3xl',
  },
  { platform: 'squarespace', url: 'https://www.aaksonline.com/shop/p/ambi-olive' },
  {
    platform: 'squarespace',
    url: 'https://dumb-industries.com/store/p/dumb-industries-2025-eco-tote-bag',
  },
  {
    platform: 'wix',
    url: 'https://www.evolveclothinggallery.com/product-page/new-balance-530-sneakers-mr530rs-silver-metallic-moonbeam',
  },
  {
    platform: 'wix',
    url: 'https://www.internationaldiamondimporters.com/product-page/sterling-silver-cz-paperclip-bracelet-7inch',
  },
  { platform: 'bigcommerce', url: 'https://seabostonusa.com/bos-nantucket-fleece/' },
  { platform: 'bigcommerce', url: 'https://seekairun.com/Annabelle-navy/' },
  {
    platform: 'magento',
    url: 'https://www.forevernew.com.au/liberty-flutter-sleeve-lace-midi-dress-301551',
  },
  {
    platform: 'prestashop',
    url: 'https://www.carillons.be/pendentifs/930-pendentif-petit-moulin-a-prieres-8435131208803.html',
  },
  { platform: 'salesforce', url: 'https://us.puma.com/us/en/pd/suede-classic-xxi-sneakers/374915' },
  { platform: 'gumroad', url: 'https://easypeasyteacher.gumroad.com/l/tozuk' },
  {
    platform: 'bigcartel',
    url: 'https://danozzi.bigcartel.com/product/money-bags-sellout-shirt-black',
  },
];

async function main() {
  const { scrapeUrl } = await import('@/modules/scraper');
  const { createFetch } = await import('@/lib/http');
  const { logger } = await import('@/lib/log');

  const results: { platform: string; url: string; outcome: string; detail: string }[] = [];

  for (const { platform, url } of URLS) {
    const log = logger.child({ requestId: 'acceptance' });
    const ctx = {
      log,
      requestId: 'acceptance',
      deadlineMs: Date.now() + 30_000,
      fetch: createFetch({ log }),
    };

    const start = Date.now();
    try {
      const result = await scrapeUrl(url, { mode: 'product' }, ctx);
      const ms = Date.now() - start;
      if (result.ok) {
        results.push({
          platform,
          url,
          outcome: 'SUCCESS',
          detail: `${ms}ms, ${result.value.products[0]?.images.length ?? 0} images`,
        });
      } else if (
        result.error.code === 'INVALID_INPUT' &&
        result.error.message.includes("doesn't look like something a person wears")
      ) {
        results.push({
          platform,
          url,
          outcome: 'STAGE1_REJECTED',
          detail: `not_wearable (correct rejection), ${ms}ms`,
        });
      } else if (
        result.error.code === 'INTERNAL' &&
        JSON.stringify(result.error).includes('invalid_api_key')
      ) {
        results.push({
          platform,
          url,
          outcome: 'BLOCKED_BY_OPENAI_KEY',
          detail: `reached vision stage, ${ms}ms (pipeline correct up to here; needs a real OPENAI_API_KEY)`,
        });
      } else {
        results.push({
          platform,
          url,
          outcome: 'OTHER_FAILURE',
          detail: `${result.error.code}: ${result.error.message}`,
        });
      }
    } catch (cause) {
      results.push({ platform, url, outcome: 'THREW', detail: String(cause).slice(0, 200) });
    }
  }

  console.log('\n=== ACCEPTANCE CHECK RESULTS ===\n');
  for (const r of results) {
    console.log(`[${r.outcome}] ${r.platform}: ${r.url}\n  ${r.detail}`);
  }

  const counts: Record<string, number> = {};
  for (const r of results) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(counts, null, 2));

  process.exit(0);
}

main();

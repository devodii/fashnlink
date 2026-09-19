import type { HomepageProbe, PlatformKey } from './types';

// Section 6.3's signal table — HTML/header-only checks, cheap, from the
// single homepage probe every resolution path already fetches. This is
// separate from (and lighter than) the deep adapters' own `detect()` methods,
// which make their own extra network probes (e.g. Shopify's
// `/products.json?limit=1`) for confident resolution. This function exists so
// `stores.fingerprint` gets a full signal read even for the 6 platforms with
// no adapter built yet (section 6.3: "Store the full signal list... into
// stores.fingerprint. This is free lead-scoring data").
export function detectPlatformSignals(
  probe: HomepageProbe,
): { platform: PlatformKey; confidence: number; signals: string[] }[] {
  const { html, headers } = probe;
  const results: { platform: PlatformKey; confidence: number; signals: string[] }[] = [];

  const shopifySignals: string[] = [];
  if (headers.get('x-shopify-stage') || headers.get('x-shopid'))
    shopifySignals.push('header:x-shopify-stage|x-shopid');
  if (html.includes('cdn.shopify.com')) shopifySignals.push('html:cdn.shopify.com');
  if (/window\.Shopify|Shopify\.theme/.test(html)) shopifySignals.push('html:window.Shopify');
  if (shopifySignals.length)
    results.push({
      platform: 'shopify',
      confidence: Math.min(1, shopifySignals.length / 2),
      signals: shopifySignals,
    });

  const wooSignals: string[] = [];
  if (html.includes('/wp-content/')) wooSignals.push('html:/wp-content/');
  if (/woocommerce|wc-blocks|wc_add_to_cart_params/.test(html)) wooSignals.push('html:woocommerce');
  if (wooSignals.length >= 2)
    results.push({
      platform: 'woocommerce',
      confidence: Math.min(1, wooSignals.length / 2),
      signals: wooSignals,
    });

  const squarespaceSignals: string[] = [];
  if (html.includes('static1.squarespace.com'))
    squarespaceSignals.push('html:static1.squarespace.com');
  if (html.includes('sqs-')) squarespaceSignals.push('html:sqs-');
  if (squarespaceSignals.length)
    results.push({
      platform: 'squarespace',
      confidence: Math.min(1, squarespaceSignals.length / 2),
      signals: squarespaceSignals,
    });

  const wixSignals: string[] = [];
  if (html.includes('wixstatic.com')) wixSignals.push('html:wixstatic.com');
  if (html.includes('wix-stores')) wixSignals.push('html:wix-stores');
  if (html.includes('_wixCIDX')) wixSignals.push('html:_wixCIDX');
  if (wixSignals.length)
    results.push({
      platform: 'wix',
      confidence: Math.min(1, wixSignals.length / 2),
      signals: wixSignals,
    });

  const bigcommerceSignals: string[] = [];
  if (html.includes('cdn11.bigcommerce.com')) bigcommerceSignals.push('html:cdn11.bigcommerce.com');
  if (html.includes('stencil')) bigcommerceSignals.push('html:stencil');
  if (bigcommerceSignals.length)
    results.push({
      platform: 'bigcommerce',
      confidence: Math.min(1, bigcommerceSignals.length / 2),
      signals: bigcommerceSignals,
    });

  const magentoSignals: string[] = [];
  if (html.includes('/static/version')) magentoSignals.push('html:/static/version');
  if (/Mage\.|data-mage-init/.test(html)) magentoSignals.push('html:Mage.|data-mage-init');
  if (magentoSignals.length)
    results.push({
      platform: 'magento',
      confidence: Math.min(1, magentoSignals.length / 2),
      signals: magentoSignals,
    });

  const prestashopSignals: string[] = [];
  if (html.includes('prestashop')) prestashopSignals.push('html:prestashop');
  if (html.includes('/modules/')) prestashopSignals.push('html:/modules/');
  if (prestashopSignals.length >= 2)
    results.push({
      platform: 'prestashop',
      confidence: Math.min(1, prestashopSignals.length / 2),
      signals: prestashopSignals,
    });

  const salesforceSignals: string[] = [];
  if (html.includes('demandware.store')) salesforceSignals.push('html:demandware.store');
  if (salesforceSignals.length)
    results.push({ platform: 'salesforce', confidence: 0.8, signals: salesforceSignals });

  return results.sort((a, b) => b.confidence - a.confidence);
}

// Section 6.3's closing note — installed-app/pixel fingerprinting, free
// lead-scoring data stored alongside the platform signals.
export function fingerprintApps(html: string): Record<string, boolean> {
  return {
    klaviyo: html.includes('klaviyo.js') || /klaviyo/i.test(html),
    gorgias: /gorgias/i.test(html),
    judgeMe: /judge\.me|judgeme/i.test(html),
    loopReturns: /loopreturns|loop returns/i.test(html),
    redo: /getredo|redo\.app/i.test(html),
    metaPixel: html.includes('fbq('),
    tiktokPixel: html.includes('ttq.'),
  };
}

export function buildStoreFingerprint(probe: HomepageProbe) {
  return {
    platformSignals: detectPlatformSignals(probe),
    apps: fingerprintApps(probe.html),
  };
}

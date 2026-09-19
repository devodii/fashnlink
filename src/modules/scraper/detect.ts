import type { DetectResult, HomepageProbe, PlatformKey } from './types';

/**
 * Signal table; HTML/header-only checks, cheap, from the
 * single homepage probe every resolution path already fetches. Each
 * platform's signal function is exported individually so it can back BOTH
 * `stores.fingerprint` (`detectPlatformSignals`, every platform, used even
 * for platforms with no adapter yet; section 6.3's "free lead-scoring
 * data") AND that platform's own `ScraperAdapter.detect()` (the thin
 * JSON-LD/sitemap adapters in `shared/thin-adapter.ts`; one signal
 * function, not two separate implementations of the same regexes).
 */

function shopifySignals(html: string, headers: Headers): string[] {
  const signals: string[] = [];
  if (headers.get('x-shopify-stage') || headers.get('x-shopid'))
    signals.push('header:x-shopify-stage|x-shopid');
  if (html.includes('cdn.shopify.com')) signals.push('html:cdn.shopify.com');
  if (/window\.Shopify|Shopify\.theme/.test(html)) signals.push('html:window.Shopify');
  return signals;
}

function woocommerceSignals(html: string): string[] {
  const signals: string[] = [];
  if (html.includes('/wp-content/')) signals.push('html:/wp-content/');
  if (/woocommerce|wc-blocks|wc_add_to_cart_params/.test(html)) signals.push('html:woocommerce');
  return signals.length >= 2 ? signals : [];
}

function squarespaceSignals(html: string): string[] {
  const signals: string[] = [];
  if (html.includes('static1.squarespace.com')) signals.push('html:static1.squarespace.com');
  if (html.includes('sqs-')) signals.push('html:sqs-');
  return signals;
}

function wixSignals(html: string): string[] {
  const signals: string[] = [];
  if (html.includes('wixstatic.com')) signals.push('html:wixstatic.com');
  if (html.includes('wix-stores')) signals.push('html:wix-stores');
  if (html.includes('_wixCIDX')) signals.push('html:_wixCIDX');
  return signals;
}

function bigcommerceSignals(html: string): string[] {
  const signals: string[] = [];
  if (html.includes('cdn11.bigcommerce.com')) signals.push('html:cdn11.bigcommerce.com');
  if (html.includes('stencil')) signals.push('html:stencil');
  /**
   * Confirmed against a real store (seabostonusa.com): BigCommerce's Stencil
   * theme renders this meta tag even on pages stencil/cdn11 checks miss.
   */
  if (html.includes("content='bigcommerce.stencil'"))
    signals.push('html:meta[platform=bigcommerce.stencil]');
  return signals;
}

function magentoSignals(html: string): string[] {
  const signals: string[] = [];
  if (html.includes('/static/version')) signals.push('html:/static/version');
  if (/Mage\.|data-mage-init/.test(html)) signals.push('html:Mage.|data-mage-init');
  return signals;
}

function prestashopSignals(html: string): string[] {
  const signals: string[] = [];
  if (html.includes('prestashop')) signals.push('html:prestashop');
  if (html.includes('/modules/')) signals.push('html:/modules/');
  return signals.length >= 2 ? signals : [];
}

function salesforceSignals(html: string): string[] {
  return html.includes('demandware.store') ? ['html:demandware.store'] : [];
}

const SIGNAL_DETECTORS: Record<PlatformKey, ((html: string, headers: Headers) => string[]) | null> =
  {
    shopify: shopifySignals,
    woocommerce: woocommerceSignals,
    squarespace: squarespaceSignals,
    wix: wixSignals,
    bigcommerce: bigcommerceSignals,
    magento: magentoSignals,
    prestashop: prestashopSignals,
    salesforce: salesforceSignals,
    lemonsqueezy: null, // hostPatterns-only — no homepage signal, no browsable homepage at all
    gumroad: null,
    bigcartel: null,
    generic: null,
    manual: null,
  };

/**
 * One HTML/header probe -> a DetectResult, for any platform's own
 * `detect()`. Salesforce gets a flat high confidence on its single signal
 * (section 6.3's table treats `demandware.store` alone as sufficient,
 * unlike woocommerce/prestashop which need two signals before trusting a
 * match); every other platform's confidence scales with how many of its
 * signals matched, capped at 1.
 */
export function detectSignalsFor(platform: PlatformKey, probe: HomepageProbe): DetectResult {
  const detector = SIGNAL_DETECTORS[platform];
  if (!detector) return { match: false, confidence: 0, signals: [] };

  const signals = detector(probe.html, probe.headers);
  if (!signals.length) return { match: false, confidence: 0, signals: [] };

  const confidence = platform === 'salesforce' ? 0.8 : Math.min(1, signals.length / 2);
  return { match: confidence >= 0.5, confidence, signals };
}

export function detectPlatformSignals(
  probe: HomepageProbe,
): { platform: PlatformKey; confidence: number; signals: string[] }[] {
  const results: { platform: PlatformKey; confidence: number; signals: string[] }[] = [];
  for (const platform of Object.keys(SIGNAL_DETECTORS) as PlatformKey[]) {
    const result = detectSignalsFor(platform, probe);
    if (result.signals.length)
      results.push({ platform, confidence: result.confidence, signals: result.signals });
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Closing note; installed-app/pixel fingerprinting, free
 * lead-scoring data stored alongside the platform signals.
 */
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

// rate limit numbers live here, nowhere inline.
export const RENDERS_PER_LINK_SHOPPER_PER_DAY = 3;
export const TWIN_CREATIONS_PER_SHOPPER_PER_DAY = 10;
export const SCRAPE_REQUESTS_PER_MERCHANT_PER_HOUR = 60;
// marketing homepage's live quick-demo, abuse guard by IP.
export const QUICK_LINK_DEMO_PER_IP_PER_DAY = 3;

// new drop campaigns.
export const MAX_DROP_PRODUCTS = 3;
export const MAX_DROP_ITEMS = 2000;
// Requires at least this many resolved items before the failure rate is
// trusted, since evaluating too early (e.g. 1 failure out of 2 items = 50%)
// would pause almost every real campaign on noise.
export const DROP_FAILURE_PAUSE_MIN_SAMPLE = 10;
export const DROP_FAILURE_PAUSE_RATE = 0.2;

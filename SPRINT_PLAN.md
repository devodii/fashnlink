# Pre-launch sprint

Working list for the final pre-launch pass. Items get struck through as they land, each as its own atomic commit.

## 12. Round 2: knock out remaining items (in progress)

- [x] Job queue: crashed jobs stuck in `status: 'running'` forever now get reaped and retried (up to 5 attempts, then marked failed) instead of silently stuck. `src/modules/jobs/drain.ts` (`5812e5d`)
- [x] Storage: renamed `deleteObject(key)` to `deleteObjects(keys: string[])`, batch-calls UploadThing's `deleteFiles` once instead of once per loop iteration. Fixed both real loop call sites (`app/api/cron/cleanup/route.ts`, `src/modules/shoppers/delete-everything.ts`), updated the single-key call sites to pass a one-element array (`14633b3`)
- [ ] Broader sweep: find other places calling a single-row DB insert/update/delete inside a loop and batch them, delegated to a fork, in progress
- [x] `src/modules/storage/adapter.ts`'s dead `storageRegistry`/`Adapter` wrapper removed, nothing called it (`e0cd446`)
- [x] `ROUTES.md` written: every API route and every page route, what it does (`39ba417`)
- [x] Gave the user the Neon connection string instructions (again, in chat)
- [ ] Provision Neon + Upstash once the user hands over credentials, push env vars to Vercel, redeploy, confirm it's actually green (still the one item blocking a real production deploy)

## 3. Re-audit against the original build spec

The original pasted spec text is not saved anywhere in this repo or in my memory of this session, only milestone/module references, so this is not a literal line-by-line diff, I cannot recover the exact original wording. Verified the concrete, checkable claims instead:

- [x] 11 named scraper platform adapters (`src/modules/scraper/adapters/`): bigcartel, bigcommerce, gumroad, lemonsqueezy, magento, prestashop, salesforce, shopify, squarespace, wix, woocommerce, plus `generic.ts` and `manual.ts` as fallbacks (not counted as named platforms). Matches "11 platforms" exactly.
- [x] 28-table schema: 24 app tables in `src/db/schema.ts` + 4 auth tables in `src/db/auth-schema.ts` (user, session, account, verification) = 28.
- [x] Render engine with provider fallback: 3 providers (`fashn`, `nano_banana`, `openai_image`) routed with fallback in `src/config/models.ts` (Kling was intentionally dropped earlier this session, deprecated upstream).
- [x] Viral growth mechanics all present and wired: poll links, group links, the claim flow, retargeting/ESP push, share sheet.

## 1. Theme migration (new design system, light + dark)

- [x] Replace `app/globals.css` tokens with the provided oklch design system (background, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1..5, sidebar-*, shadows, radius, tracking, Outfit font)
- [x] Keep `--brand-1` through `--brand-6` and the `[data-brand]` merchant accent system intact, migrated to sit alongside the new tokens
- [x] Add `.dark` variant token values (provided)
- [x] Wire `next-themes` `ThemeProvider` into `app/layout.tsx` (previously imported by `sonner.tsx` only, never actually provided anywhere, so dark mode never worked)
- [x] Add a light and dark theme toggle component, placed in the dashboard shell header
- [x] Swap in the Outfit font (was Geist)
- landed in `2316e57`

## 2. Founding pass promo banner

- [x] Remove the per-page `BuyFoundingPassButton` from dashboard page headers (Overview, Billing), delete the now-dead component
- [x] Replace with one persistent top banner in the dashboard shell (styled like the reference "You are in Test mode" bar), shown once, not per-page, computed once in the dashboard layout
- [x] Slide-down animation on page load, pure Tailwind (translate + duration, no framer-motion)
- landed mixed into commit `85e8f9b` due to a concurrent git-index race with the loading-state audit fork (content correct, commit message is misleading, not rewriting shared history to fix it)

## 3. Dashboard user menu

- [x] Remove the click-to-open popover/dropdown on the sidebar footer email
- [x] Replace with an inline logout icon-button on the far left, side by side with the avatar and email (always visible, no menu)
- landed in the same `85e8f9b` commit as item 2

## 4. Remove demo pages

- [x] Remove `app/demo/[requestId]/` (page + demo-processing.tsx)
- [x] `app/quick-demo-form.tsx` now calls the quick-link API directly and routes straight to `/t/[slug]` instead of the removed processing page
- Scope decision (asked the user, since `system-merchant.ts` also backs the real `/claim/[storeId]` growth flow, not just the demo): keep the quick-demo homepage feature and the claim flow working, only remove the dedicated wait screen. `system-merchant.ts`, `/claim/[storeId]`, and `scripts/demo-scrape.ts` (an unrelated CLI dev tool) all stay.
- landed in `887088f`

## 5. Role-based route protection audit

- [x] Full audit done. No real gaps found: dashboard layout genuinely gates every nested page, onboarding doesn't loop, `/me` is scoped by a signed httpOnly cookie (not a guessable URL param), `/r/[renderId]` gates on `isPublic`, `/p/[slug]`'s `?s=` param is an intentional unguessable share link, `/claim/[storeId]` only shows blurred teasers, `/login` has no redirect so no loop is possible.
- Noted, not fixed (business logic, not a security/leak issue): `/t/[slug]` only blocks rendering on `status === 'archived'`, not `'paused'` — the product page itself still renders for a paused link, only render creation is blocked. Tracked under item 6.

## 6. Business logic correctness pass

- [x] Checked the `/t/[slug]` paused-link behavior flagged in the route audit: not a bug. The page renders normally for a paused link (correct, a paused link isn't a dead link), and clicking "See it on you" already fails gracefully through the existing `INSUFFICIENT_CREDITS` path with "this shop's try-on is paused" (`credit-ledger.ts`), which `try-on-flow.tsx` already displays. A hard 404 would be worse UX than this.
- [x] Full audit of credit ledger, render routing/fallback, webhook idempotency, and crons. Found and fixed 5 real, launch-blocking bugs:
  1. `60a2980` Credit ledger race condition: concurrent renders for the same merchant could both pass a balance check and both deduct, going over budget. Fixed with a per-merchant `pg_advisory_xact_lock`.
  2. `a63c65a` The `openai_image` fallback provider was completely broken: its synchronous self-delivered webhook always 404'd because `renders.provider` was only persisted after the whole routing chain returned, not before the webhook could reference it. This silently failed 100% of the time for `set`/`shoes`/`accessory`/`unknown` categories whenever `nano_banana` also failed, refunding a credit and showing an error even though the image had actually rendered.
  3. `cd82eb6` The Polar/paykit payment webhook could double-grant founder credits on a concurrent retry delivery (select-then-insert dedup race). Fixed with insert-first-and-check-if-it-claimed-the-row.
  4. `2b737cd` A redelivered fal webhook (standard provider retry behavior) for an already-terminal twin or render would reprocess it, double-refunding a failed render or re-uploading a succeeded one.
  5. `400c2d2` No protection against double-submitting a render: no `Idempotency-Key` header was sent despite `api-handler.ts` supporting it, and no client-side guard against a real double-click, so one shopper gesture could burn two credits.
- Investigated and confirmed correct, not touched: render routing's provider-fallback order, the jobs-queue drain's `SELECT ... FOR UPDATE SKIP LOCKED` claiming, and the cleanup/catalog-refresh/abandoned-cart crons' windowing against their firing cadence.
- Flagged, not fixed (follow-up, not launch-blocking): the abandoned-cart cron's per-shopper dedup has the same select-then-insert shape as the payment webhook bug, but for a duplicate marketing email, not a financial double-grant, and a proper fix needs a new unique index (a schema migration) rather than a same-shape minimal fix. Also: crashed `campaign.renderItem` jobs can leave a `campaignItems` row stuck `pending` forever (no timeout-based requeue in the job queue), which needs job-type-specific retry-safety judgment, not a blind fix.

## 7. Duplication and generics sweep

- [x] `apiHandler`: every `merchant_session`/`shopper_session` route called `requireMerchantSession(auth)`/`requireShopperSession(auth)` then checked `.ok` by hand. `HandlerConfig` is now generic over the declared auth scope, so the handler receives an already-narrowed `merchant`/`shopper` param directly, and the two now-dead `require*Session` exports are gone. Landed in `0834e01` and `d9f3441`. This was the one real, high-value duplication pattern found across the API layer.
- [x] Looked for other repeated logic/shapes (form field patterns, repo query patterns). Nothing else rose to "genuinely simplifies": the per-page `requireMerchant()` calls are the correct, idiomatic use of a `cache()`-wrapped fetcher in Server Components, not duplication; Drizzle's repeated `select().from(x).where(eq(x.id, id)).limit(1)` shape is standard and a generic `findById` helper would add indirection without removing real complexity, given column selections differ per call site.

## 11. Server-rendering and loading-state audit

- [x] Every `page.tsx` is already a Server Component except `/login`, which does no data fetching at all so there's nothing to push server-side.
- [x] Added `loading.tsx` to every route segment that does a real fetch and lacked one: onboarding, `/me`, `/t/[slug]`, `/p/[slug]`, `/r/[renderId]`, `/claim/[storeId]`, dashboard drops (both), dashboard links/[id]. Skipped `dashboard/links/new` deliberately, nothing to wait on there.
- landed across `a1449a4`, `1e15230`, `80ac071`, `fb18a53`, `85e8f9b`, `e1c1b22`, `471a4de`, `58eb543`

## 8. Remove unused files and dead style

- [x] `components/ui/tabs.tsx` removed (confirmed unused, `42da256`)
- [x] Found and removed 8 more orphaned components with zero real usages anywhere: `filter-bar`, `image-compare`, `kbd`, `pagination`, `search-input`, `shimmer-card` (orphaned by removing the demo processing page it was built for), `stepper`, `timeline`, plus their stories files (`f642326`)
- [x] `language-picker.tsx` and `language-suggest-banner.tsx` were also unused, but they have live backing infrastructure (`TranslateProvider`, `config/languages.ts`, `lib/google-translate.ts` are all actively wired into the root layout), so wired them into the try-on page instead of deleting them (`f912f8e`). Not yet wired into the poll/group link flows (`poll-flow.tsx`, `group-flow.tsx`), only the main `try-on-flow.tsx`, follow-up if wanted.
- [ ] Broader sweep for unused CSS/utility classes still pending

## 9. Copy pass: remove em dashes and fluff

- [x] Repo-wide sweep done: 90 em dashes across 32 files replaced with the conjunction, colon, comma, or period-split that reads best per sentence, no meaning changed. Landed across `c376c82`, `0fdeab9`, `5045345`, `0c80f5c`. Confirmed zero remaining with a final repo-wide grep.

## 10. Deliverables for the user

### How to test as a merchant

1. Go to `/login`, sign in with a magic link (or Google, if configured). A fresh account auto-creates a merchant row with a placeholder name.
2. First login redirects to `/onboarding` (enforced: no `settings.contactChannel` yet means no dashboard access). Paste a product URL, set your brand name and accent color, pick a contact channel (WhatsApp/Instagram/email), finish the wizard.
3. You land on `/dashboard`. Test each nav item: Links, Products, Leads, Retargeting, Billing, Settings.
4. Create a link from `/dashboard/links/new`, confirm it shows up in the links table and works when opened as a shopper (below).
5. Settings: change accent color, logo, contact channel, confirm it reflects on your public `/t/[slug]` pages.
6. Billing: the founding pass banner should show at the top of the dashboard shell if you're on the free plan and seats remain (not per-page anymore).
7. Toggle light/dark via the theme toggle in the dashboard header, confirm it persists across a reload.
8. Sign out via the icon button next to your avatar in the sidebar footer (no dropdown anymore).

### How to test as a shopper

1. Open a merchant's `/t/[slug]` link in a private/incognito window (no login required).
2. Click "See it on you", accept the consent checkboxes, upload or take a selfie.
3. Wait for the twin build and render (needs real `FAL_KEY`/`OPENAI_API_KEY` and, in local dev, `TUNNEL_URL` pointed at a tunnel so fal's webhook can reach you).
4. Confirm the result screen: share sheet, buy button, "message the shop" link (if a contact channel is set).
5. Visit `/me` afterward (same browser, same shopper cookie) to see your closet history.
6. Try a poll link and a group link too (`link.kind === 'poll' | 'group'`), they're separate flows (`poll-flow.tsx`, `group-flow.tsx`) from the main try-on flow.
7. Try the homepage quick-demo (`/`): paste a URL, it scrapes it under a system merchant and takes you straight to a real `/t/[slug]` link, no separate processing page anymore.
8. Test the language picker (top right of the try-on page) and the auto-suggest banner if your browser language differs from the shop's.

### Full page inventory

| Route                                                               | Access                                                         | What it is                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/`                                                                 | Public                                                         | Marketing homepage, quick-demo paste-a-link form, pricing          |
| `/login`                                                            | Public                                                         | Magic link + Google sign-in                                        |
| `/onboarding`                                                       | Merchant session, redirected here until contact channel is set | 3-step wizard: product, brand, first link                          |
| `/dashboard`                                                        | Merchant session + onboarded                                   | Overview: credits, stats, recent links                             |
| `/dashboard/links`, `/dashboard/links/new`, `/dashboard/links/[id]` | Merchant                                                       | Manage try-on links                                                |
| `/dashboard/products`                                               | Merchant                                                       | Synced product catalog                                             |
| `/dashboard/leads`                                                  | Merchant                                                       | Shoppers who left an email                                         |
| `/dashboard/drops/new`, `/dashboard/drops/[id]`                     | Merchant                                                       | Retargeting campaign drops                                         |
| `/dashboard/retargeting`                                            | Merchant                                                       | ESP connection, abandoned-cart settings                            |
| `/dashboard/billing`                                                | Merchant                                                       | Credits, ledger, plan                                              |
| `/dashboard/settings`                                               | Merchant                                                       | Brand, contact, logo, accent color                                 |
| `/t/[slug]`                                                         | Public                                                         | The core try-on flow (or poll/group flow depending on link kind)   |
| `/p/[slug]`                                                         | Public (unguessable `?s=` share link)                          | Poll voting view                                                   |
| `/r/[renderId]`                                                     | Public if `isPublic`                                           | Shared render page (OG image, share target)                        |
| `/me`                                                               | Shopper cookie, scoped to that cookie only                     | Shopper's own closet history                                       |
| `/claim/[storeId]`                                                  | Public (teaser), claim action needs merchant session           | Claim a store that was scraped under the anonymous system merchant |
| `/platforms`                                                        | Public                                                         | Supported platform list                                            |
| `/legal/privacy`, `/legal/terms`                                    | Public                                                         | Static legal pages                                                 |

Every merchant route is gated by `app/(merchant)/dashboard/layout.tsx` calling `requireMerchant()` (redirects to `/login`) then checking `settings.contactChannel` (redirects to `/onboarding`). Every API route declares an explicit `auth` scope in `apiHandler` (`merchant_session`, `shopper_session`, `cron`, `webhook`, or `public`), verified in the route-protection audit above.

---

Working directly in this repo, atomic commits, lowercase conventional prefixes, no AI co-author line, `pnpm format` before every commit, push after every commit.

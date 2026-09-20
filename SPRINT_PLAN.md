# Pre-launch sprint

Working list for the final pre-launch pass. Items get struck through as they land, each as its own atomic commit.

Note on item 3 (re-audit against the original build spec): the original pasted spec text is not saved anywhere in this repo or in my memory of this session, only milestone/module references. I am auditing against what the actual codebase demonstrates (scraper adapters, render providers, DB schema, milestone folder structure) rather than a literal text diff, since I cannot recover the original wording. Flagging this so it is not mistaken for a full line-by-line spec check.

## 1. Theme migration (new design system, light + dark)
- [ ] Replace `app/globals.css` tokens with the provided oklch design system (background, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1..5, sidebar-*, shadows, radius, tracking, Outfit font)
- [ ] Keep `--brand-1` through `--brand-6` and the `[data-brand]` merchant accent system intact, migrated to sit alongside the new tokens
- [ ] Add `.dark` variant token values (provided)
- [ ] Wire `next-themes` `ThemeProvider` into `app/layout.tsx` (currently imported by `sonner.tsx` only, never actually provided anywhere, so dark mode has never worked)
- [ ] Add a light and dark theme toggle component, placed in the dashboard shell
- [ ] Swap in the Outfit font (currently Geist)

## 2. Founding pass promo banner
- [ ] Remove the per-page `BuyFoundingPassButton` from dashboard page headers (Overview, Billing)
- [ ] Replace with one persistent top banner in the dashboard shell (styled like the reference "You are in Test mode" bar), shown once, not per-page
- [ ] Slide-down animation on page load, pure Tailwind (translate + duration, no framer-motion), pushes page content down rather than overlapping it

## 3. Dashboard user menu
- [ ] Remove the click-to-open popover/dropdown on the sidebar footer email
- [ ] Replace with an inline logout icon-button on the far left, side by side with the avatar and email (always visible, no menu)

## 4. Remove demo pages
- [ ] Remove `app/demo/[requestId]/` (page + demo-processing.tsx)
- [ ] Remove `app/quick-demo-form.tsx` and its usage in `app/page.tsx`
- [ ] Remove `src/config/system-merchant.ts` and its usages if nothing else needs the system/demo merchant
- [ ] Remove `scripts/demo-scrape.ts` if it only supported the demo flow
- [ ] Update the marketing homepage copy/CTA now that quick-demo is gone

## 5. Role-based route protection audit
- [ ] Walk every route under `app/(merchant)`, `app/(shopper)`, `app/(auth)`, and top-level pages
- [ ] Confirm each merchant route calls `requireMerchant()` (or inherits it via layout)
- [ ] Confirm shopper-only routes (`/me`, closet) have their own real guard, not just merchant guard
- [ ] Confirm public routes (`/t/[slug]`, `/p/[slug]`, `/r/[renderId]`, `/platforms`, legal pages) are intentionally public, not accidentally exposed data

## 6. Business logic correctness pass
- [ ] Re-check credit ledger, render routing/fallback, webhook idempotency, abandoned-cart cron, catalog refresh cron for correctness
- [ ] Flag anything actually wrong (not stylistic) as its own commit with the fix

## 7. Duplication and generics sweep
- [ ] Find repeated logic/shapes across the codebase (form field patterns, repo query patterns, etc.) and factor out with generics where it genuinely simplifies, not for its own sake

## 8. Remove unused files and dead style
- [ ] Sweep for files nothing imports, and unused CSS/utility classes
- [ ] Remove `components/ui/tabs.tsx` (confirmed unused earlier this session) unless something now needs it

## 9. Copy pass: remove em dashes and fluff
- [ ] Repo-wide sweep replacing em dashes in UI copy and comments with proper conjunctions (or, and, so)
- [ ] Cut filler phrasing in user-facing text

## 10. Deliverables for the user
- [ ] How to test as a shopper (step by step)
- [ ] How to test as a merchant (step by step)
- [ ] Full page inventory: every route, what it is, who can access it, how it connects to the rest

---

Working directly in this repo, atomic commits, lowercase conventional prefixes, no AI co-author line, `pnpm format` before every commit, push after every commit.

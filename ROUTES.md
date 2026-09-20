# Route reference

Every API route and every page, what it does, and who can reach it. `auth` scopes match `src/lib/api-handler.ts`'s `AuthScope`: `merchant_session` (dashboard owner), `shopper_session` (anonymous, cookie-identified visitor), `cron` (Vercel Cron only, `CRON_SECRET` bearer token), `webhook` (verified signature, no session), `public` (anyone).

## API routes

### Auth

| Route                | Method    | Auth   | What it does                                                            |
| -------------------- | --------- | ------ | ----------------------------------------------------------------------- |
| `/api/auth/[...all]` | GET, POST | public | better-auth's own handler: magic link, Google OAuth, session management |

### Merchant account

| Route                              | Method | Auth     | What it does                                                                                                                 |
| ---------------------------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/api/merchants/me`                | PATCH  | merchant | Update brand name, accent color, logo, contact channel                                                                       |
| `/api/merchants/me/delete`         | POST   | merchant | Delete a merchant account (links, leads, credit history; product/render history tied to the store is preserved for shoppers) |
| `/api/merchants/me/checkout`       | POST   | merchant | Create a Polar/paykit checkout session, returns a payment URL                                                                |
| `/api/merchants/me/esp-connection` | POST   | merchant | Save an ESP (Klaviyo etc.) API key connection; `?test=true` instead tests the existing saved connection                      |

### Links, products, drops

| Route                     | Method | Auth     | What it does                                                                                                                                                                |
| ------------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/links`              | POST   | merchant | Scrape product URL(s), create a link; body `kind: 'single' \| 'group' \| 'poll'` picks a single try-on link, a "shop with friends" group link, or a poll link from 2-3 URLs |
| `/api/links/[id]`         | PATCH  | merchant | Update a link's status (active/paused/archived)                                                                                                                             |
| `/api/campaigns`          | POST   | merchant | Create a retargeting drop (bulk render campaign against opted-in shoppers)                                                                                                  |
| `/api/campaigns/estimate` | POST   | merchant | Estimate credit cost of a campaign before creating it                                                                                                                       |
| `/api/platform-requests`  | POST   | merchant | Log a "we don't support this platform yet" request from onboarding                                                                                                          |

### Twins and renders (the core try-on pipeline)

| Route                      | Method | Auth    | What it does                                                                                                              |
| -------------------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/api/twins`               | POST   | shopper | Upload a selfie, moderate it, kick off twin generation                                                                    |
| `/api/twins/[id]/status`   | GET    | shopper | Poll twin generation status                                                                                               |
| `/api/renders`             | POST   | shopper | Submit a render request (twin + garment), reserves a credit, routes to a provider                                         |
| `/api/renders/[id]`        | DELETE | shopper | Delete a render and its stored image                                                                                      |
| `/api/renders/[id]`        | POST   | shopper | Record an event against a render; body `event: 'share' \| 'buy_click' \| 'visibility'` (visibility also takes `isPublic`) |
| `/api/renders/[id]/status` | GET    | shopper | Poll render status                                                                                                        |

### Shopper account

| Route                       | Method | Auth    | What it does                                                                        |
| --------------------------- | ------ | ------- | ----------------------------------------------------------------------------------- |
| `/api/me`                   | DELETE | shopper | Erase everything for the current shopper (GDPR-style, batched storage + DB deletes) |
| `/api/me/retarget-optout`   | POST   | shopper | Opt out of a merchant's retargeting emails                                          |
| `/api/shoppers/attribution` | POST   | shopper | Record which render a shopper arrived via (for viral-loop attribution)              |
| `/api/shoppers/email`       | POST   | shopper | Save an email address (the "save your closet" gate)                                 |

### Leads

| Route        | Method | Auth    | What it does                                            |
| ------------ | ------ | ------- | ------------------------------------------------------- |
| `/api/leads` | POST   | shopper | Capture a lead (email + retarget opt-in) after a render |

### Polls and groups

| Route                       | Method | Auth     | What it does                                    |
| --------------------------- | ------ | -------- | ----------------------------------------------- |
| `/api/polls/[linkId]`       | GET    | public   | Poll state and vote counts                      |
| `/api/polls/[linkId]/vote`  | POST   | shopper  | Cast a vote on a poll link                      |
| `/api/polls/[linkId]/close` | POST   | merchant | Manually close a poll before the 48h auto-close |
| `/api/groups/[linkId]`      | GET    | public   | Group link state (who's joined)                 |
| `/api/groups/[linkId]/join` | POST   | shopper  | Join a group link                               |

### Claims

| Route                         | Method | Auth     | What it does                                                                                    |
| ----------------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------- |
| `/api/claims/[storeId]/claim` | POST   | merchant | Claim a store that was scraped under the anonymous system merchant (the quick-demo growth loop) |

### ESP templates

| Route                                  | Method | Auth   | What it does                                                    |
| -------------------------------------- | ------ | ------ | --------------------------------------------------------------- |
| `/api/esp-templates/klaviyo-abandoned` | GET    | public | Static download of a pre-built Klaviyo abandoned-cart flow JSON |

### Crons (Vercel Cron only, see `vercel.json`)

| Route                        | Schedule    | What it does                                                                                                             |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/api/cron/jobs`             | every 5 min | Drains the job queue (`SELECT ... FOR UPDATE SKIP LOCKED`), also reaps jobs stuck in `running` past 10 minutes           |
| `/api/cron/refresh-catalogs` | hourly      | Finds stores due for a catalog re-crawl, enqueues a `store.crawled` job per store                                        |
| `/api/cron/abandoned`        | hourly      | Finds tryon-no-buy renders, pushes an "abandoned" event to the merchant's ESP, deduped per shopper with an advisory lock |
| `/api/cron/cleanup`          | daily       | Deletes render images and rows older than 90 days for anonymous (no-email) shoppers                                      |

### Webhooks

| Route                  | Auth                                      | What it does                                                                         |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `/api/webhooks/fal`    | webhook (query-param secret)              | fal.ai render/twin completion callback, ignores redelivery for already-terminal jobs |
| `/api/webhooks/paykit` | public (signature checked in the handler) | Polar/paykit payment event, grants founder credits, deduped by payment event id      |

### Public/growth

| Route                    | Method | Auth   | What it does                                                                                              |
| ------------------------ | ------ | ------ | --------------------------------------------------------------------------------------------------------- |
| `/api/public/quick-link` | POST   | public | The homepage quick-demo: scrape a URL under the anonymous system merchant, return a real `/t/[slug]` link |

### Infra

| Route              | What it does                                                                           |
| ------------------ | -------------------------------------------------------------------------------------- |
| `/api/uploadthing` | UploadThing's own file-router handler for client-initiated uploads (selfies)           |
| `/api/docs`        | Auto-generated list of every registered `apiHandler` route, from `routeRegistry`       |
| `/api/mcp/tools`   | Auto-generated MCP tool list, from `mcpToolsRegistry`, for routes with an `mcp` config |

## Pages

| Route                                                               | Access                                                           | What it is                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/`                                                                 | Public                                                           | Marketing homepage, quick-demo paste-a-link form, pricing          |
| `/login`                                                            | Public                                                           | Magic link + Google sign-in                                        |
| `/onboarding`                                                       | Merchant session, redirected here until a contact channel is set | 3-step wizard: product, brand, first link                          |
| `/dashboard`                                                        | Merchant, onboarded                                              | Overview: credits, stats, recent links                             |
| `/dashboard/links`, `/dashboard/links/new`, `/dashboard/links/[id]` | Merchant                                                         | Manage try-on links                                                |
| `/dashboard/products`                                               | Merchant                                                         | Synced product catalog                                             |
| `/dashboard/leads`                                                  | Merchant                                                         | Shoppers who left an email                                         |
| `/dashboard/drops/new`, `/dashboard/drops/[id]`                     | Merchant                                                         | Retargeting campaign drops                                         |
| `/dashboard/retargeting`                                            | Merchant                                                         | ESP connection, abandoned-cart settings                            |
| `/dashboard/billing`                                                | Merchant                                                         | Credits, ledger, plan                                              |
| `/dashboard/settings`                                               | Merchant                                                         | Brand, contact, logo, accent color                                 |
| `/t/[slug]`                                                         | Public                                                           | The core try-on flow (or poll/group flow depending on link kind)   |
| `/p/[slug]`                                                         | Public (unguessable `?s=` share link)                            | Poll voting view                                                   |
| `/r/[renderId]`                                                     | Public if `isPublic`                                             | Shared render page (OG image, share target)                        |
| `/me`                                                               | Shopper cookie, scoped to that cookie only                       | Shopper's own closet history                                       |
| `/claim/[storeId]`                                                  | Public (teaser), claim action needs merchant session             | Claim a store that was scraped under the anonymous system merchant |
| `/platforms`                                                        | Public                                                           | Supported platform list                                            |
| `/legal/privacy`, `/legal/terms`                                    | Public                                                           | Static legal pages                                                 |

Every merchant route is gated by `app/(merchant)/dashboard/layout.tsx` calling `requireMerchant()` (redirects to `/login`) then checking `settings.contactChannel` (redirects to `/onboarding`). Every API route declares an explicit `auth` scope in `apiHandler`, enforced centrally in `src/lib/api-handler.ts`, not per-route.

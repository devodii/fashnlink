// Side-effect-only: every route built with apiHandler() registers itself
// into routeRegistry / mcpToolsRegistry as a module-load side effect. That's
// reliable in a single long-running process, but Next.js/Vercel can bundle
// each API route into its own isolated function in production — nothing
// guarantees another route's module has actually been imported (and
// therefore run its registration) by the time GET /api/docs or
// GET /api/mcp/tools executes.
//
// This file exists to force that: it imports every route file for its side
// effects, and app/api/docs and app/api/mcp/tools import THIS file first, so
// the registries are complete no matter which route Vercel cold-starts.
// New route built with apiHandler() -> add one import line here, same
// "one file, one registry line" cost as every other adapter/registry in this
// codebase (scraper adapters, render providers, ...).
import '@/app/api/cron/jobs/route';
import '@/app/api/docs/route';
import '@/app/api/mcp/tools/route';
import '@/app/api/webhooks/fal/route';
import '@/app/api/twins/route';
import '@/app/api/twins/[id]/status/route';
import '@/app/api/renders/route';
import '@/app/api/renders/[id]/route';
import '@/app/api/renders/[id]/status/route';
import '@/app/api/renders/[id]/buy-click/route';
import '@/app/api/renders/[id]/share/route';
import '@/app/api/renders/[id]/visibility/route';
import '@/app/api/shoppers/attribution/route';
import '@/app/api/shoppers/email/route';
import '@/app/api/leads/route';
import '@/app/api/me/route';
import '@/app/api/og/render/[renderId]/route';
import '@/app/api/links/route';
import '@/app/api/links/[id]/route';
import '@/app/api/merchants/me/route';
import '@/app/api/merchants/me/delete/route';
import '@/app/api/platform-requests/route';
import '@/app/api/webhooks/polar/route';
import '@/app/api/links/poll/route';
import '@/app/api/links/group/route';
import '@/app/api/polls/[linkId]/route';
import '@/app/api/polls/[linkId]/vote/route';
import '@/app/api/polls/[linkId]/close/route';
import '@/app/api/groups/[linkId]/join/route';
import '@/app/api/groups/[linkId]/route';
import '@/app/api/public/quick-link/route';
import '@/app/api/claims/[storeId]/claim/route';
import '@/app/api/cron/refresh-catalogs/route';
import '@/app/api/cron/cleanup/route';
import '@/app/api/me/retarget-optout/route';
import '@/app/api/cron/abandoned/route';
import '@/app/api/campaigns/route';
import '@/app/api/campaigns/estimate/route';
import '@/app/api/merchants/me/esp-connection/route';
import '@/app/api/merchants/me/esp-connection/test/route';
// NOTE: app/api/esp-templates/klaviyo-abandoned/route.ts is intentionally
// NOT imported here — it's a plain static-file GET, not built with
// apiHandler(), so it has nothing to register.

/**
 * Vercel can bundle each API route into its own isolated function in
 * production, so a route's module-load side effect (registering itself into
 * routeRegistry / mcpToolsRegistry) is not guaranteed to have run before
 * another route's cold start. Importing every route file here, and having
 * GET /api/docs and GET /api/mcp/tools import this file first, forces all
 * registrations to happen regardless of which route Vercel cold-starts.
 */
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
import '@/app/api/webhooks/paykit/route';
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
import '@/app/api/merchants/me/checkout/route';

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

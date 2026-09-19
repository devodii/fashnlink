// Side-effect-only, same reasoning as `src/lib/api-handler-routes.ts`: each
// job handler registers itself into the type -> handler map as a module-load
// side effect, but Vercel can bundle `app/api/cron/jobs/route.ts` (the only
// place `drainJobs` runs) in isolation from whatever module happens to
// define a given job type. Importing every handler-defining module here,
// and importing THIS file from the drain route, guarantees the registry is
// complete no matter which route cold-starts first. New job type -> add one
// import line here.
import '@/modules/scraper/jobs';

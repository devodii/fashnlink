// Vercel can bundle the drain route in isolation from whatever module
// defines a given job type, so every handler-defining module is imported
// here to guarantee the registry is complete regardless of cold-start order.
import '@/modules/scraper/jobs';
import '@/modules/campaigns/render-item';

import { z } from 'zod';
import '@/lib/api-handler-routes';
import { apiHandler, routeRegistry } from '@/lib/api-handler';
import { ok } from '@/lib/result';

// Introspects routeRegistry (every route built with apiHandler, section
// api-handler) so API documentation stays generated, not hand-maintained.
function describeRoutes() {
  return Array.from(routeRegistry.values()).map((route) => ({
    name: route.name,
    body: route.schema?.body ? z.toJSONSchema(route.schema.body) : null,
    params: route.schema?.params ? z.toJSONSchema(route.schema.params) : null,
    query: route.schema?.query ? z.toJSONSchema(route.schema.query) : null,
    mcp: route.mcp ? { name: route.mcp.name, description: route.mcp.description } : null,
  }));
}

export const GET = apiHandler({
  name: 'docs.listRoutes',
  auth: ['public'],
  handler: async () => ok({ routes: describeRoutes() }),
});

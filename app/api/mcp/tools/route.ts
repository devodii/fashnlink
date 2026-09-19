import { z } from 'zod';
import '@/lib/api-handler-routes';
import { apiHandler, mcpToolsRegistry } from '@/lib/api-handler';
import { ok } from '@/lib/result';

/**
 * Only routes that opt in via `config.mcp` appear here (most routes; e.g.
 * webhooks; have no business being an agent tool). Shape matches what an
 * MCP server's `tools/list` response expects, so a future MCP transport
 * (Phase 2) can wrap this listing directly instead of hand-defining tools.
 */
function describeMcpTools() {
  return Array.from(mcpToolsRegistry.values()).map((route) => ({
    name: route.mcp!.name,
    description: route.mcp!.description,
    inputSchema: route.schema?.body
      ? z.toJSONSchema(route.schema.body)
      : { type: 'object' as const, properties: {}, additionalProperties: false },
  }));
}

export const GET = apiHandler({
  name: 'mcp.listTools',
  auth: ['public'],
  handler: async () => ok({ tools: describeMcpTools() }),
});

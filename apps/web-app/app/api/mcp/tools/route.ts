import { z } from 'zod';
import '@/lib/api-handler-routes';
import { apiHandler, mcpToolsRegistry } from '@/lib/api-handler';
import { ok } from '@/lib/result';

/** Shape matches what an MCP server's `tools/list` response expects. */
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

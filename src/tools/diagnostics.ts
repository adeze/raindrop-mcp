import { z } from "zod";
import pkg from "../../package.json";
import type { ToolHandlerContext } from "./common.js";
import { defineTool } from "./common.js";

export const DiagnosticsInputSchema = z.object({
  includeEnvironment: z
    .boolean()
    .optional()
    .describe("Include environment info"),
});

export const DiagnosticsOutputSchema = z.object({
  version: z.string(),
  mcpProtocolVersion: z.string(),
  sdkVersion: z.string(),
  nodeVersion: z.string(),
  enabledTools: z.array(z.string()),
  libraryHealth: z.record(z.string(), z.number()).optional(),
});

export const createDiagnosticsTool = (
  serverVersion: string,
  getEnabledToolNames: () => string[],
) =>
  defineTool({
    name: "diagnostics",
    annotations: { readOnlyHint: true, destructiveHint: false },
    description: "Diagnostics resource and runtime metadata.",
    inputSchema: DiagnosticsInputSchema,
    outputSchema: DiagnosticsOutputSchema,
    handler: async (
      args?: z.infer<typeof DiagnosticsInputSchema>,
      context?: ToolHandlerContext,
    ) => {
      const stats = context?.raindropService
        ? await context.raindropService.getUserStats()
        : null;

      // Fetch health metrics if service is available
      let healthDetails = {};
      if (context?.raindropService) {
        const [broken, duplicates, untagged] = await Promise.all([
          context.raindropService.getBookmarks({ broken: true, perPage: 1 }),
          context.raindropService.getBookmarks({
            duplicates: true,
            perPage: 1,
          }),
          context.raindropService.getBookmarks({ notag: true, perPage: 1 }),
        ]);
        healthDetails = {
          brokenCount: broken.count,
          duplicateCount: duplicates.count,
          untaggedCount: untagged.count,
        };
      }

      const diagnosticsData = {
        version: serverVersion,
        mcpProtocolVersion: "2026-07-28",
        sdkVersion: pkg.dependencies["@modelcontextprotocol/server"],
        nodeVersion: process.version,
        bunVersion: typeof Bun !== "undefined" ? Bun.version : undefined,
        os: process.platform,
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        libraryHealth: stats
          ? {
              totalBookmarks: stats.bookmarks,
              totalCollections: stats.collections,
              totalHighlights: stats.highlights,
              totalTags: stats.tags,
              ...healthDetails,
            }
          : undefined,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          MCP_DEBUG: process.env.MCP_DEBUG,
          MCP_TRANSPORT: process.env.MCP_TRANSPORT,
          RAINDROP_ACCESS_TOKEN: process.env.RAINDROP_ACCESS_TOKEN
            ? "set"
            : "unset",
        },
        enabledTools: getEnabledToolNames(),
        memory: process.memoryUsage(),
      };

      return {
        content: [
          {
            type: "resource",
            resource: {
              uri: "diagnostics://server",
              mimeType: "application/json",
              text: JSON.stringify(diagnosticsData, null, 2),
            },
          },
        ],
        structuredContent: DiagnosticsOutputSchema.parse(diagnosticsData),
      };
    },
  });

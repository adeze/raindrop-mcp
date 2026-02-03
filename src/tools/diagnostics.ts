import { z } from "zod";
import type { ToolHandlerContext } from "./common.js";
import { defineTool } from "./common.js";

export const DiagnosticsInputSchema = z.object({
  includeEnvironment: z
    .boolean()
    .optional()
    .describe("Include environment info"),
});

export const DiagnosticsOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal("resource"),
      resource: z.object({
        uri: z.string(),
        mimeType: z.string().optional(),
        text: z.string(),
      }),
    }),
  ),
});

export const createDiagnosticsTool = (
  serverVersion: string,
  getEnabledToolNames: () => string[],
) =>
  defineTool({
    name: "diagnostics",
    description: "Diagnostics resource and runtime metadata.",
    inputSchema: DiagnosticsInputSchema,
    outputSchema: DiagnosticsOutputSchema,
    handler: async (
      _args?: z.infer<typeof DiagnosticsInputSchema>,
      _context?: ToolHandlerContext,
    ): Promise<z.infer<typeof DiagnosticsOutputSchema>> => {
      const diagnosticsData = {
        version: serverVersion,
        mcpProtocolVersion: "2025-11-25",
        sdkVersion: "1.25.3",
        nodeVersion: process.version,
        bunVersion: typeof Bun !== "undefined" ? Bun.version : undefined,
        os: process.platform,
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
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
      };
    },
  });

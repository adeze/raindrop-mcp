import { z } from "zod";
import { defineTool } from "./common.js";
import type { ToolHandlerContext } from "./common.js";

export const DiagnosticsInputSchema = z.object({
  includeEnvironment: z
    .boolean()
    .optional()
    .describe("Include environment info"),
});

export const DiagnosticsOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      uri: z.string(),
      name: z.string(),
      description: z.string(),
      mimeType: z.string(),
      _meta: z.record(z.string(), z.any()),
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
    ): Promise<z.infer<typeof DiagnosticsOutputSchema>> => ({
      content: [
        {
          type: "resource_link",
          uri: "diagnostics://server",
          name: "Server Diagnostics",
          description: `Server diagnostics and environment info resource. Version: ${serverVersion}`,
          mimeType: "application/json",
          _meta: {
            version: serverVersion,
            mcpProtocolVersion: process.env.MCP_PROTOCOL_VERSION || "unknown",
            nodeVersion: process.version,
            bunVersion: typeof Bun !== "undefined" ? Bun.version : undefined,
            os: process.platform,
            uptime: process.uptime(),
            startTime: new Date(
              Date.now() - process.uptime() * 1000,
            ).toISOString(),
            env: {
              NODE_ENV: process.env.NODE_ENV,
              MCP_DEBUG: process.env.MCP_DEBUG,
              MCP_TRANSPORT: process.env.MCP_TRANSPORT,
              RAINDROP_ACCESS_TOKEN: process.env.RAINDROP_ACCESS_TOKEN
                ? "set"
                : "unset",
            },
            enabledTools: getEnabledToolNames(),
            apiStatus: "unknown",
            memory: process.memoryUsage(),
          },
        },
      ],
    }),
  });

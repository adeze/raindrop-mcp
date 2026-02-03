#!/usr/bin/env node
/**
 * Entry point for the Raindrop MCP server (STDIO transport).
 *
 * Initializes the MCP server using STDIO transport for environments where direct process communication is required.
 * Loads environment variables, sets up logging, and ensures graceful shutdown on exit signals.
 *
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 * @see StdioServerTransport
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { RaindropMCPService } from "./services/raindropmcp.service.js";
import { createLogger } from "./utils/logger.js";

config({ quiet: true }); // Load .env file quietly

const logger = createLogger("mcp-stdio");

// Validate required environment variables early to prevent silent crashes
if (!process.env.RAINDROP_ACCESS_TOKEN) {
  console.error(
    "ERROR: RAINDROP_ACCESS_TOKEN environment variable is required",
  );
  console.error(
    "Please set your Raindrop.io API token before starting the server.",
  );
  console.error(
    "Visit https://app.raindrop.io/settings/integrations to generate a token.",
  );
  process.exit(1);
}

/**
 * Bootstraps the STDIO-based MCP server.
 *
 * - Instantiates the STDIO transport and Raindrop MCP service.
 * - Connects the MCP server to the transport.
 * - Handles graceful shutdown on SIGINT and SIGTERM.
 *
 * @see StdioServerTransport
 * @see RaindropMCPService
 */
export async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  const raindropMCP = new RaindropMCPService();
  const server = raindropMCP.getServer();
  const cleanup = raindropMCP.cleanup.bind(raindropMCP);

  await server.connect(transport);
  logger.info("MCP server connected via STDIO transport");

  // Handle graceful shutdown on SIGINT
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully");
    try {
      await cleanup();
      await server.close();
      logger.info("Server shut down completed");
    } catch (error) {
      logger.error("Error during shutdown:", error);
    }
    process.exit(0);
  });

  // Handle graceful shutdown on SIGTERM
  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully");
    try {
      await cleanup();
      await server.close();
      logger.info("Server shut down completed");
    } catch (error) {
      logger.error("Error during shutdown:", error);
    }
    process.exit(0);
  });
}

main().catch((error) => {
  // Use stderr for error logging to avoid polluting STDIO MCP protocol
  logger.error("Server error:", error);
  process.exit(1);
});

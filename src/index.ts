/**
 * Entrypoint for the MCP STDIO server.
 *
 * This file launches the optimized Raindrop MCP server using STDIO transport only.
 * No HTTP or SSE endpoints are exposed here.
 *
 * All logging is sent to stderr to avoid polluting the STDIO protocol stream.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from 'dotenv';
import { RaindropMCPService } from './services/raindropmcp.service.js';
import { createLogger } from './utils/logger.js';

config({ quiet: true }); // Load .env file quietly

const logger = createLogger('mcp-stdio');

/**
 * Main bootstrap for the STDIO-based MCP server.
 * Sets up the transport, connects the server, and handles graceful shutdown.
 */
export async function main() {
  const transport = new StdioServerTransport();
  // Await the creation of the Raindrop server and destructure the result
  const { server, cleanup } = new RaindropMCPService();

  await server.connect(transport);
  logger.info('MCP server connected via STDIO transport');

  // Cleanup on exit
  process.on("SIGINT", async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    try {
      await cleanup();
      await server.close();
      logger.info('Server shut down completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    try {
      await cleanup();
      await server.close();
      logger.info('Server shut down completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
    process.exit(0);
  });
}

main().catch((error) => {
  // Use stderr for error logging to avoid polluting STDIO MCP protocol
  logger.error("Server error:", error);
  process.exit(1);
});

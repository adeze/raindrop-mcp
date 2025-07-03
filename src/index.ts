import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from 'dotenv';
import { createOptimizedRaindropServer } from './services/mcp-optimized.service.js';
import { createLogger } from './utils/logger.js';

config(); // Load .env file

const logger = createLogger('mcp-stdio');

// Only the optimized MCP server and STDIO transport are used in this entrypoint.
// No HTTP or SSE endpoints are exposed here.
// 
// IMPORTANT: This server uses STDIO for MCP protocol communication.
// All logging uses stderr to avoid polluting the STDIO protocol stream.

export async function main() {
  const transport = new StdioServerTransport();
  // Await the creation of the optimized server and destructure the result
  const { server, cleanup } = createOptimizedRaindropServer();

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

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from 'dotenv';
import { createOptimizedRaindropServer } from './services/mcp-optimized.service.js';
config(); // Load .env file

// Only the optimized MCP server and STDIO transport are used in this entrypoint.
// No HTTP or SSE endpoints are exposed here.
// All logging is routed to stderr to ensure stdout contains only MCP protocol messages.

let isShuttingDown = false;

/**
 * Graceful shutdown handler that cleans up resources and flushes output
 * @param signal - The signal that triggered shutdown
 * @param server - MCP server instance
 * @param cleanup - Cleanup function from service
 */
async function gracefulShutdown(signal: string, server: any, cleanup: () => Promise<void>) {
  if (isShuttingDown) {
    // Force exit if already shutting down
    process.stderr.write(`Force exit on second ${signal}\n`);
    process.exit(1);
  }
  
  isShuttingDown = true;
  process.stderr.write(`Received ${signal}, shutting down gracefully...\n`);
  
  try {
    // Cleanup resources in proper order
    await cleanup();
    await server.close();
    
    // Flush stderr before exit
    process.stderr.write('Shutdown complete\n');
    await new Promise(resolve => process.stderr.write('', resolve));
    
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error during shutdown: ${error}\n`);
    process.exit(1);
  }
}

export async function main() {
  const transport = new StdioServerTransport();
  let server: any;
  let cleanup: () => Promise<void>;
  
  try {
    // Await the creation of the optimized server and destructure the result
    const result = createOptimizedRaindropServer();
    server = result.server;
    cleanup = result.cleanup;

    await server.connect(transport);

    // Process event handlers for graceful shutdown
    process.on("SIGINT", () => gracefulShutdown("SIGINT", server, cleanup));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server, cleanup));
    
    // Handle uncaught exceptions and unhandled rejections
    process.on("uncaughtException", async (error) => {
      process.stderr.write(`Uncaught exception: ${error.message}\n${error.stack}\n`);
      if (server && cleanup) {
        await gracefulShutdown("uncaughtException", server, cleanup);
      } else {
        process.exit(1);
      }
    });
    
    process.on("unhandledRejection", async (reason, promise) => {
      process.stderr.write(`Unhandled rejection at: ${promise}, reason: ${reason}\n`);
      if (server && cleanup) {
        await gracefulShutdown("unhandledRejection", server, cleanup);
      } else {
        process.exit(1);
      }
    });
    
  } catch (error) {
    process.stderr.write(`Failed to initialize server: ${error}\n`);
    process.exit(1);
  }
}

// Main execution with error handling routed to stderr
main().catch((error) => {
  // Ensure all error output goes to stderr, never stdout
  process.stderr.write(`Server error: ${error.message || error}\n`);
  if (error.stack) {
    process.stderr.write(`${error.stack}\n`);
  }
  process.exit(1);
});

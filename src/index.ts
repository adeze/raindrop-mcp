import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from 'dotenv';
import { createOptimizedRaindropServer } from './services/mcp-optimized.service.js';
config(); // Load .env file

// Only the optimized MCP server and STDIO transport are used in this entrypoint.
// No HTTP or SSE endpoints are exposed here.

export async function main() {
  const transport = new StdioServerTransport();
  // Await the creation of the optimized server and destructure the result
  const { server, cleanup } = createOptimizedRaindropServer();

  await server.connect(transport);

  // Cleanup on exit
  process.on("SIGINT", async () => {
    await cleanup();
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

import { config } from "dotenv";
import { describe, expect, it } from "vitest";

// Load .env from project root
config();
// config({ path: '../.env' });
describe(".env configuration", () => {
  it("should load RAINDROP_ACCESS_TOKEN from environment variables and emit its value", () => {
    const accessToken = process.env.RAINDROP_ACCESS_TOKEN;
    // Defensive checks for type safety and presence
    expect(typeof accessToken).toBe("string");
    expect(accessToken).toBeDefined();
    expect(accessToken).not.toBe("");
    // Emit the value for debugging (write to stderr to avoid interfering with MCP protocol)
    process.stderr.write(`RAINDROP_ACCESS_TOKEN value: ${accessToken}\n`);
  });
});

// Server entrypoint tests removed - main() is a long-running process
// Use integration tests in mcp.service.test.ts or e2e tests instead

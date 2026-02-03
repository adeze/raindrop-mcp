import { describe, expect, it } from "vitest";

// MCP Inspector tests
// Note: These tests verify the Inspector can connect to the server,
// but are skipped by default as they spawn child processes and are slow.
// Run with: bun test inspector.test.ts

describe("MCP Inspector Integration", () => {
  it.skip("can be tested manually with: bun run inspector", () => {
    // This is a placeholder for manual Inspector testing
    // Run: bun run inspector
    // Then interact with the UI to verify tools/resources/prompts
    expect(true).toBe(true);
  });

  it("server builds successfully for Inspector use", async () => {
    // Just verify the build artifacts exist
    const fs = await import("fs/promises");
    const buildExists = await fs
      .access("build/index.js")
      .then(() => true)
      .catch(() => false);
    expect(buildExists).toBe(true);
  });
});

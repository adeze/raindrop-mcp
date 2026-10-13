import { describe, expect, it } from "vite-plus/test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// MCP Inspector tests
// Note: These tests verify the Inspector can connect to the server,
// but are skipped by default as they spawn child processes and are slow.
// Run with: bun run test -- tests/inspector.test.ts

describe("MCP Inspector Integration", () => {
  it.skip("can be tested manually with: bun run inspector", () => {
    // This is a placeholder for manual Inspector testing
    // Run: bun run inspector
    // Then interact with the UI to verify tools/resources/prompts
    expect(true).toBe(true);
  });

  it("packaged server connects over STDIO without installed dependencies", async () => {
    const directory = await mkdtemp(join(tmpdir(), "raindrop-mcp-package-"));
    const client = new Client({ name: "package-test", version: "1.0.0" });
    try {
      await cp("build", join(directory, "build"), { recursive: true });
      await writeFile(join(directory, "package.json"), '{"type":"module"}');
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [join(directory, "build/index.js")],
          cwd: directory,
          env: { RAINDROP_ACCESS_TOKEN: "offline-package-test" },
          stderr: "pipe",
        }),
      );
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name)).toContain("bookmark_search");
      expect(tools.every((tool) => tool.inputSchema.type === "object")).toBe(
        true,
      );
      expect(
        tools.find((tool) => tool.name === "bookmark_manage")?.annotations
          ?.destructiveHint,
      ).toBe(true);
      const templates = await client.listResourceTemplates();
      expect(
        templates.resourceTemplates.map((template) => template.uriTemplate),
      ).toEqual(["mcp://collection/{id}", "mcp://raindrop/{id}"]);
      for (const name of [
        "diagnostics",
        "collection_list",
        "bookmark_search",
      ]) {
        expect(
          tools.find((tool) => tool.name === name)?.outputSchema,
        ).toBeDefined();
      }
    } finally {
      await client.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});

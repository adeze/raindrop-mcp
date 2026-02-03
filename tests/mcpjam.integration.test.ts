import { MCPClientManager } from "@mcpjam/sdk";
import { config } from "dotenv";
import fs from "fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config();

const hasToken = Boolean(process.env.RAINDROP_ACCESS_TOKEN);

const describeIf = hasToken ? describe : describe.skip;

describeIf("MCPJam SDK Integration", () => {
  let manager: MCPClientManager;

  beforeAll(async () => {
    const buildExists = await fs
      .access("build/index.js")
      .then(() => true)
      .catch(() => false);

    if (!buildExists) {
      throw new Error(
        "Missing build/index.js. Run `bun run build` before this test.",
      );
    }

    manager = new MCPClientManager();

    const baseEnv = Object.fromEntries(
      Object.entries(process.env).filter(
        ([, value]): value is string => typeof value === "string",
      ),
    );

    await manager.connectToServer("raindrop", {
      command: "bun",
      args: ["run", "build/index.js"],
      env: {
        ...baseEnv,
        RAINDROP_ACCESS_TOKEN: process.env.RAINDROP_ACCESS_TOKEN as string,
      },
    });
  });

  afterAll(async () => {
    if (manager) {
      await manager.disconnectServer("raindrop");
    }
  });

  it("exposes core tools", async () => {
    const { tools } = await manager.listTools("raindrop");
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain("diagnostics");
    expect(toolNames).toContain("collection_list");
    expect(toolNames).toContain("bookmark_search");
  });

  it("executes diagnostics tool", async () => {
    const result = await manager.executeTool("raindrop", "diagnostics", {});

    if ("task" in result) {
      throw new Error(
        `Expected tool response content, received task status: ${result.task.status}`,
      );
    }

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);

    const content = result.content[0];
    expect(content.type).toBe("resource");
    expect(content.resource.uri).toBe("diagnostics://server");
    expect(content.resource.text).toBeDefined();

    const diagnostics = JSON.parse(content.resource.text as string);
    expect(diagnostics.mcpProtocolVersion).toBe("2025-11-25");
    expect(diagnostics.version).toBeDefined();
  });
});

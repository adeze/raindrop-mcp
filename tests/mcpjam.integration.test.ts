import { MCPClientManager } from "@mcpjam/sdk";
import { config } from "dotenv";
import fs from "fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config();

const hasToken = Boolean(process.env.RAINDROP_ACCESS_TOKEN);

const describeIf = hasToken ? describe : describe.skip;

const isStringEntry = (entry: [string, unknown]): entry is [string, string] =>
  typeof entry[1] === "string";

const hasTaskStatus = (value: unknown): value is { task: { status: string } } =>
  typeof value === "object" &&
  value !== null &&
  "task" in value &&
  typeof (value as { task?: { status?: unknown } }).task?.status === "string";

const hasContentArray = (
  value: unknown,
): value is {
  content: Array<{ type: string; resource?: { uri?: string; text?: string } }>;
} =>
  typeof value === "object" &&
  value !== null &&
  "content" in value &&
  Array.isArray(
    (
      value as {
        content?: Array<{
          type: string;
          resource?: { uri?: string; text?: string };
        }>;
      }
    ).content,
  );

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
      Object.entries(process.env).filter(isStringEntry),
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

    if (hasTaskStatus(result)) {
      throw new Error(
        `Expected tool response content, received task status: ${result.task.status}`,
      );
    }

    if (!hasContentArray(result)) {
      throw new Error("Expected tool response with content array");
    }

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);

    const content = result.content[0];
    if (!content) {
      throw new Error("Expected diagnostics content item");
    }
    expect(content.type).toBe("resource");
    if (!content.resource || !content.resource.text) {
      throw new Error("Expected diagnostics resource payload");
    }
    expect(content.resource.uri).toBe("diagnostics://server");

    const diagnostics = JSON.parse(content.resource.text as string);
    expect(diagnostics.mcpProtocolVersion).toBe("2025-11-25");
    expect(diagnostics.version).toBeDefined();
  });
});

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

config();

const hasToken = Boolean(process.env.RAINDROP_ACCESS_TOKEN?.trim());
const describeIf = hasToken ? describe : describe.skip;

const isDiagnosticsResource = (
  content: unknown,
): content is { type: "resource"; resource: { uri: string; text: string } } =>
  typeof content === "object" &&
  content !== null &&
  "type" in content &&
  content.type === "resource" &&
  "resource" in content &&
  typeof content.resource === "object" &&
  content.resource !== null &&
  "uri" in content.resource &&
  content.resource.uri === "diagnostics://server" &&
  "text" in content.resource &&
  typeof content.resource.text === "string";

describeIf("MCP protocol integration", () => {
  let client: Client;
  let service: RaindropMCPService;

  beforeAll(async () => {
    service = new RaindropMCPService();
    vi.spyOn(service.raindropService, "getUserStats").mockResolvedValue({
      bookmarks: 0,
      collections: 0,
      highlights: 0,
      tags: 0,
      trash: 0,
    });
    vi.spyOn(service.raindropService, "getBookmarks").mockResolvedValue({
      items: [],
      count: 0,
    });
    client = new Client({ name: "raindrop-mcp-test-client", version: "1.0.0" });

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      service.getServer().connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterAll(async () => {
    await client?.close();
    await service?.cleanup();
  });

  it("exposes core tools through the MCP client", async () => {
    const { tools } = await client.listTools();
    const toolNames = tools.map((tool) => tool.name);

    expect(toolNames).toContain("diagnostics");
    expect(toolNames).toContain("collection_list");
    expect(toolNames).toContain("bookmark_search");
    for (const name of ["diagnostics", "collection_list", "bookmark_search"]) {
      expect(
        tools.find((tool) => tool.name === name)?.outputSchema,
      ).toBeDefined();
    }
  });

  it("executes diagnostics through the MCP client", async () => {
    const result = await client.callTool({
      name: "diagnostics",
      arguments: {},
    });
    const content = (result as { content: unknown }).content;
    if (!Array.isArray(content)) {
      throw new Error("Expected tool response content array");
    }
    const diagnosticsContent = content.find(isDiagnosticsResource);

    expect(diagnosticsContent).toBeDefined();
    if (!diagnosticsContent) {
      throw new Error("Expected diagnostics resource payload");
    }

    const diagnostics = JSON.parse(diagnosticsContent.resource.text);
    expect(diagnostics.mcpProtocolVersion).toBe("2026-07-28");
    expect(diagnostics.version).toBeDefined();
    expect(result.structuredContent).toMatchObject({
      mcpProtocolVersion: "2026-07-28",
      version: diagnostics.version,
    });
  });
});

import { config } from "dotenv";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

config();
const hasAccessToken = Boolean(process.env.RAINDROP_ACCESS_TOKEN?.trim());
const runLiveApiTests = process.env.RUN_LIVE_API_TESTS === "true";
const runLive = hasAccessToken && runLiveApiTests;
const describeLive = runLive ? describe : describe.skip;

const USER_PROFILE_URI = "mcp://user/profile";
const DIAGNOSTICS_URI = "diagnostics://server";

const firstResourceUriByPrefix = (content: any[], prefix: string) => {
  const item = content.find(
    (entry) =>
      entry?.type === "resource" &&
      typeof entry?.resource?.uri === "string" &&
      entry.resource.uri.startsWith(prefix),
  );
  return item?.resource?.uri as string | undefined;
};

const parseIdFromResourceUri = (uri: string) => {
  const id = Number.parseInt(uri.split("/").pop() || "", 10);
  if (!Number.isFinite(id)) {
    throw new Error(`Failed to parse numeric ID from URI: ${uri}`);
  }
  return id;
};

describe("RaindropMCPService", () => {
  let mcpService: RaindropMCPService;

  beforeEach(async () => {
    if (mcpService && typeof mcpService.cleanup === "function") {
      await mcpService.cleanup();
    }
    mcpService = new RaindropMCPService();
  });

  afterEach(async () => {
    if (typeof mcpService?.cleanup === "function") {
      await mcpService.cleanup();
    }
    mcpService = undefined as unknown as RaindropMCPService;
  });

  // Only readonly API calls and metadata/resource checks are tested below

  it("should successfully initialize McpServer", () => {
    const server = mcpService.getServer();
    expect(server).toBeDefined();
  });

  it("should list available tools", async () => {
    const tools = await mcpService.listTools();
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    // Check that each tool has required properties and types
    for (const tool of tools) {
      expect(tool).toHaveProperty("id");
      expect(typeof tool.id).toBe("string");
      expect(tool).toHaveProperty("name");
      expect(typeof tool.name).toBe("string");
      expect(tool).toHaveProperty("description");
      expect(typeof tool.description).toBe("string");
      expect(tool).toHaveProperty("inputSchema");
      expect(tool).toHaveProperty("outputSchema");
    }
    // Check for a known tool
    const diagnosticsTool = tools.find((t: any) => t.id === "diagnostics");
    expect(diagnosticsTool).toBeDefined();
    expect(diagnosticsTool?.name.toLowerCase()).toContain("diagnostic");
  });

  it("should read the diagnostics resource via a public API", async () => {
    if (typeof mcpService.readResource !== "function") {
      throw new Error(
        "readResource(uri: string) public method not implemented on RaindropMCPService",
      );
    }
    const result = await mcpService.readResource(DIAGNOSTICS_URI);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const first = result[0];
    if (!first) throw new Error("No diagnostics content returned");
    expect(first.uri).toBe(DIAGNOSTICS_URI);
    expect(first.text).toContain("diagnostics");
  });

  it("should list all registered resources with metadata", () => {
    const resources = mcpService.listResources();
    expect(resources).toBeDefined();
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBeGreaterThan(0);
    for (const resource of resources) {
      expect(resource).toHaveProperty("id");
      expect(resource).toHaveProperty("uri");
    }
  });

  it("should return true for healthCheck", async () => {
    const healthy = await mcpService.healthCheck();
    expect(healthy).toBe(true);
  });

  it("should return correct server info", () => {
    const info = mcpService.getInfo();
    expect(info).toBeDefined();
    expect(info).toHaveProperty("name");
    expect(info).toHaveProperty("version");
    expect(info).toHaveProperty("description");
    expect(typeof info.name).toBe("string");
    expect(typeof info.version).toBe("string");
    expect(typeof info.description).toBe("string");
  });

  it("should expose diagnostics tool in available tools", async () => {
    const tools = await mcpService.listTools();
    const diagnosticsTool = tools.find((t: any) => t.id === "diagnostics");

    expect(diagnosticsTool).toBeDefined();
    if (!diagnosticsTool) {
      throw new Error("Diagnostics tool not found in tool list");
    }
    expect(diagnosticsTool.name).toBe("diagnostics");
    expect(diagnosticsTool.description).toContain("Diagnostics");
  });
});

describeLive("RaindropMCPService live API checks", () => {
  let mcpService: RaindropMCPService;

  beforeEach(async () => {
    if (mcpService && typeof mcpService.cleanup === "function") {
      await mcpService.cleanup();
    }
    mcpService = new RaindropMCPService();
  });

  afterEach(async () => {
    if (typeof mcpService?.cleanup === "function") {
      await mcpService.cleanup();
    }
    mcpService = undefined as unknown as RaindropMCPService;
  });

  it("reads user profile resource when live tests are enabled", async () => {
    const result = await mcpService.readResource(USER_PROFILE_URI);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const first = result[0];
    if (!first) throw new Error("No user profile content returned");
    expect(first.uri).toBe(USER_PROFILE_URI);
    expect(first.text).toContain("profile");
  });

  it("discovers a collection and reads it via resource URI", async () => {
    const listResult = await mcpService.callTool("collection_list", {});
    const collectionUri = firstResourceUriByPrefix(
      listResult.content,
      "mcp://collection/",
    );

    if (!collectionUri) {
      throw new Error("No collection resource URI found from collection_list");
    }

    const resource = await mcpService.readResource(collectionUri);
    const first = resource[0];
    if (!first) throw new Error("No collection resource content returned");
    expect(first.uri).toBe(collectionUri);
    expect(first.text).toContain("collection");
  });

  it("discovers a bookmark and reads it via resource URI", async () => {
    const listCollections = await mcpService.callTool("collection_list", {});
    const collectionUri = firstResourceUriByPrefix(
      listCollections.content,
      "mcp://collection/",
    );

    if (!collectionUri) {
      throw new Error("No collection resource URI found from collection_list");
    }

    const collectionId = parseIdFromResourceUri(collectionUri);
    const listBookmarks = await mcpService.callTool("list_raindrops", {
      collectionId,
      perPage: 10,
    });

    const raindropUri = firstResourceUriByPrefix(
      listBookmarks.content,
      "mcp://raindrop/",
    );

    if (!raindropUri) {
      throw new Error("No raindrop resource URI found from list_raindrops");
    }

    const resource = await mcpService.readResource(raindropUri);
    const first = resource[0];
    if (!first) throw new Error("No raindrop resource content returned");
    expect(first.uri).toBe(raindropUri);
    expect(first.text).toContain("raindrop");
  });
});

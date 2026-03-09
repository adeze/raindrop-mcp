import { beforeEach, describe, expect, it } from "vitest";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Library Audit Tool", () => {
  let mcpService: RaindropMCPService;

  beforeEach(() => {
    // We can use the real service but we'll need to mock the underlying API calls
    // if we want to avoid real network requests.
    // For the "Red" phase, we just want to see it fail because the tool isn't registered.
    mcpService = new RaindropMCPService();
  });

  it("should have library_audit, empty_trash, and cleanup_collections tools registered", async () => {
    const tools = await mcpService.listTools();
    expect(tools.find((t) => t.id === "library_audit")).toBeDefined();
    expect(tools.find((t) => t.id === "empty_trash")).toBeDefined();
    expect(tools.find((t) => t.id === "cleanup_collections")).toBeDefined();
  });

  it("should return audit summary including broken, duplicate, and untagged items", async () => {
    const result = await mcpService.callTool("library_audit", {});
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain("Audit Results");
    expect(result.content[0].text).toContain("Broken links");
    expect(result.content[0].text).toContain("Potential duplicates");
    expect(result.content[0].text).toContain("Untagged items");
  });
});

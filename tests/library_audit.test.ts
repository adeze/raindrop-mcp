import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Library Audit Tool", () => {
  let mcpService: RaindropMCPService;

  beforeEach(() => {
    mcpService = new RaindropMCPService();
    vi.spyOn(mcpService.raindropService, "getBookmarks").mockImplementation(
      async (params) => ({
        items: [],
        count: params?.broken ? 1 : params?.duplicates ? 2 : 3,
      }),
    );
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
    expect(result.content[0].text).toContain("Broken links: 1");
    expect(result.content[0].text).toContain("Potential duplicates: 2");
    expect(result.content[0].text).toContain("Untagged items: 3");
  });
});

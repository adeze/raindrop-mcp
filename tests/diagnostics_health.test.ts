import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Diagnostics Health Stats", () => {
  let mcpService: RaindropMCPService;

  beforeEach(() => {
    mcpService = new RaindropMCPService();
    vi.spyOn(mcpService.raindropService, "getUserStats").mockResolvedValue({
      bookmarks: 10,
      collections: 3,
      highlights: 0,
      tags: 2,
      trash: 4,
    });
    vi.spyOn(mcpService.raindropService, "getBookmarks").mockImplementation(
      async (params) => ({
        items: [],
        count: params?.broken ? 1 : params?.duplicates ? 2 : 3,
      }),
    );
  });

  it("should include detailed library health in diagnostics tool output", async () => {
    const result = await mcpService.callTool("diagnostics", {});
    expect(result.content).toBeDefined();

    const content = result.content[0];
    expect(content.type).toBe("resource");
    expect(content.resource.uri).toBe("diagnostics://server");

    const diagnostics = JSON.parse(content.resource.text);
    expect(diagnostics.libraryHealth).toBeDefined();

    // Core stats
    expect(diagnostics.libraryHealth.totalBookmarks).toBeDefined();
    expect(diagnostics.libraryHealth.totalCollections).toBeDefined();

    // Enhanced health metrics
    expect(diagnostics.libraryHealth.brokenCount).toBeDefined();
    expect(diagnostics.libraryHealth.duplicateCount).toBeDefined();
    expect(diagnostics.libraryHealth.untaggedCount).toBeDefined();

    expect(diagnostics.libraryHealth).toEqual({
      totalBookmarks: 10,
      totalCollections: 3,
      totalHighlights: 0,
      totalTags: 2,
      brokenCount: 1,
      duplicateCount: 2,
      untaggedCount: 3,
    });
  });
});
